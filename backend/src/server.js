import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { readLeads, writeLeads } from './db.js';
import { estimateLead, generateAISummary, scoreLeadQuality } from './ai.js';
import { sendLeadEmail, sendReferralEmail, sendSubscriptionEmail } from './mailer.js';
import { startDailyBackupScheduler } from './backup.js';

const app = express();

const GIVEAWAY_THRESHOLD = 50;
const GIVEAWAY_MIN_ESTIMATE = 495;
const GIVEAWAY_STARTS_AT = '2026-07-20T07:30:00+10:00';
const GIVEAWAY_ENDS_AT = '2026-08-21T20:30:00+10:00';
const GIVEAWAY_START_MS = Date.parse(GIVEAWAY_STARTS_AT);
const GIVEAWAY_END_MS = Date.parse(GIVEAWAY_ENDS_AT);
const BUSINESS_EMAIL = 'tandaprocleaning@gmail.com';
const COMMAND_CENTRE_NAME = 'T & A Command Centre';
const LEAD_RATE_LIMIT_WINDOW_MS = Number(process.env.LEAD_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const LEAD_RATE_LIMIT_MAX = Number(process.env.LEAD_RATE_LIMIT_MAX || 8);
const MIN_FORM_FILL_MS = Number(process.env.MIN_FORM_FILL_MS || 2500);
const SPAM_NOTES_PATTERN = /(casino|crypto|forex|seo\s*service|backlinks?|viagra|adult\s*dating|loan\s*offer|free\s*money)/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const leadRateMap = new Map();
const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4174',
  'http://127.0.0.1:4174',
];
const PROD_ORIGINS = [
  'https://www.tandaprocleaning.com.au',
  'https://tandaprocleaning.com.au',
];

const REQUIRED_FIELDS = [
  'firstName',
  'phone',
  'email',
  'address',
  'service',
  'pricingItemCode',
  'propertyType',
  'storeys',
  'rooms',
  'serviceArea',
  'accessDifficulty',
  'conditionLevel',
  'preferredTime',
];

function readAllowedOrigins() {
  const envOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set([...LOCAL_ORIGINS, ...PROD_ORIGINS, ...envOrigins]);
}

const allowedOrigins = readAllowedOrigins();

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);
app.use(express.json({ limit: '30mb' }));

function toSafeString(value) {
  return String(value ?? '').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toSafeString(value));
}

function getClientIp(req) {
  const forwardedFor = toSafeString(req.headers['x-forwarded-for']);
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0];
    return toSafeString(first) || 'unknown';
  }
  return toSafeString(req.ip) || toSafeString(req.socket?.remoteAddress) || 'unknown';
}

function pruneRateEntries(now) {
  for (const [ip, timestamps] of leadRateMap.entries()) {
    const filtered = timestamps.filter((ts) => now - ts <= LEAD_RATE_LIMIT_WINDOW_MS);
    if (!filtered.length) {
      leadRateMap.delete(ip);
      continue;
    }
    leadRateMap.set(ip, filtered);
  }
}

function leadRateLimit(req, res, next) {
  const now = Date.now();
  pruneRateEntries(now);

  const ip = getClientIp(req);
  const history = leadRateMap.get(ip) || [];
  if (history.length >= LEAD_RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many quote requests from this connection. Please wait a few minutes and try again.',
    });
  }

  history.push(now);
  leadRateMap.set(ip, history);
  return next();
}

function countUrls(text) {
  const matches = toSafeString(text).match(URL_PATTERN);
  return Array.isArray(matches) ? matches.length : 0;
}

function isRecentDuplicate(cleanLead, leads) {
  const submittedAt = Date.parse(cleanLead.clientSubmittedAt) || Date.now();
  const comparePhone = toSafeString(cleanLead.phone);
  const compareAddress = toSafeString(cleanLead.address).toLowerCase();

  return leads.some((entry) => {
    if (toSafeString(entry.phone) !== comparePhone) {
      return false;
    }
    if (toSafeString(entry.address).toLowerCase() !== compareAddress) {
      return false;
    }
    const createdAt = Date.parse(entry.createdAt || entry.receivedAt || '');
    if (!Number.isFinite(createdAt)) {
      return false;
    }
    return Math.abs(submittedAt - createdAt) < 2 * 60 * 1000;
  });
}

function validateAntiSpam(body, cleanLead, leads) {
  if (cleanLead.website) {
    return 'Submission blocked.';
  }

  if (!cleanLead.agree) {
    return 'Please accept the Terms & Conditions before submitting.';
  }

  const elapsedMs = Number(body.formElapsedMs || 0);
  if (Number.isFinite(elapsedMs) && elapsedMs > 0 && elapsedMs < MIN_FORM_FILL_MS) {
    return 'Submission looked automated. Please wait a moment and submit again.';
  }

  const notes = toSafeString(cleanLead.notes);
  if (notes && (SPAM_NOTES_PATTERN.test(notes) || countUrls(notes) > 1)) {
    return 'Submission flagged as spam. Please remove promotional links/text and try again.';
  }

  if (isRecentDuplicate(cleanLead, leads)) {
    return 'A very similar quote was just received. Please wait a moment before re-submitting.';
  }

  return '';
}

function normalizeAddons(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => toSafeString(item)).filter(Boolean);
}

function normalizeLineItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => ({
      code: toSafeString(line?.code),
      quantity: Math.max(0, Number(line?.quantity) || 0),
    }))
    .filter((line) => line.code)
    .slice(0, 12);
}

function normalizePhotoUploads(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      name: toSafeString(item?.name),
      type: toSafeString(item?.type) || 'image/jpeg',
      size: Number(item?.size) || 0,
      dataUrl: toSafeString(item?.dataUrl),
    }))
    .filter((item) => item.name && item.dataUrl && item.type.startsWith('image/') && item.size > 0)
    .slice(0, 5);
}

function parsePayload(body) {
  if (body && typeof body.payload === 'string') {
    try {
      const parsed = JSON.parse(body.payload);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  if (body && body.payload && typeof body.payload === 'object') {
    return body.payload;
  }

  return body && typeof body === 'object' ? body : {};
}

function ensureDataFile(filePath, defaultValue = '[]') {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultValue);
  }
}

function readJsonFile(filePath, fallback = []) {
  ensureDataFile(filePath);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  ensureDataFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(Array.isArray(data) ? data : [], null, 2));
}

function extensionFromMime(mimeType = '') {
  const normalized = String(mimeType).toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  return 'jpg';
}

function savePhotoUploads(leadId, photoUploads) {
  if (!photoUploads.length) {
    return [];
  }

  const uploadDir = path.resolve(process.cwd(), 'data', 'uploads', leadId);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const saved = [];
  photoUploads.forEach((photo, index) => {
    const base64Match = photo.dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    if (!base64Match) {
      return;
    }

    const ext = extensionFromMime(photo.type);
    const filename = `${String(index + 1).padStart(2, '0')}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    try {
      fs.writeFileSync(filePath, Buffer.from(base64Match[1], 'base64'));
      saved.push({
        name: photo.name,
        type: photo.type,
        size: photo.size,
        storedPath: path.relative(path.resolve(process.cwd(), 'data'), filePath).replace(/\\/g, '/'),
      });
    } catch {
      // Skip invalid writes.
    }
  });

  return saved;
}

function queueEmailPayload(payload) {
  const queuePath = path.resolve(process.cwd(), 'data', 'email-outbox.json');
  const queue = readJsonFile(queuePath, []);
  queue.push(payload);
  writeJsonFile(queuePath, queue);
}

function makeSubmissionId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function readSubmissions(fileName) {
  return readJsonFile(path.resolve(process.cwd(), 'data', fileName), []);
}

function writeSubmissions(fileName, submissions) {
  writeJsonFile(path.resolve(process.cwd(), 'data', fileName), submissions);
}

function validateReferralSubmission(referral) {
  const checks = [
    [referral?.referrer?.fullName, 'Please enter the referrer full name.'],
    [referral?.referrer?.phone, 'Please enter the referrer phone number.'],
    [referral?.referrer?.email, 'Please enter the referrer email address.'],
    [referral?.customer?.fullName, 'Please enter the referred customer full name.'],
    [referral?.customer?.phone, 'Please enter the referred customer phone number.'],
    [referral?.customer?.address, 'Please enter the customer property address.'],
    [referral?.job?.serviceNeeded, 'Please select the service needed.'],
  ];

  const missing = checks.find(([value]) => !toSafeString(value));
  if (missing) {
    return missing[1];
  }

  if (!Boolean(referral?.consent?.customerPermission)) {
    return 'Please confirm the referred customer has given contact permission.';
  }

  if (!Boolean(referral?.consent?.commissionTermsAccepted) || !Boolean(referral?.consent?.referralTermsAccepted)) {
    return 'Please accept the referral program terms before submitting.';
  }

  return '';
}

function validateSubscriptionSubmission(subscription) {
  const checks = [
    [subscription?.customer?.fullName, 'Please enter your full name.'],
    [subscription?.customer?.phone, 'Please enter your phone number.'],
    [subscription?.customer?.email, 'Please enter your email address.'],
    [subscription?.property?.address, 'Please enter the property address.'],
    [subscription?.property?.suburb, 'Please enter the suburb.'],
    [subscription?.property?.postcode, 'Please enter the postcode.'],
    [subscription?.plan?.selectedPlan, 'Please select a subscription plan.'],
    [subscription?.plan?.firstCleanPrice, 'Please calculate the first clean price.'],
    [subscription?.plan?.recurringMonthlyPrice, 'Please calculate the recurring monthly price.'],
  ];

  const missing = checks.find(([value]) => {
    if (typeof value === 'number') {
      return !Number.isFinite(value) || value <= 0;
    }
    return !toSafeString(value);
  });
  if (missing) {
    return missing[1];
  }

  return '';
}

function isWithinGiveawayCampaign(referenceDate = new Date()) {
  const timestamp = referenceDate instanceof Date ? referenceDate.getTime() : Date.parse(referenceDate);
  return Number.isFinite(timestamp) && timestamp >= GIVEAWAY_START_MS && timestamp <= GIVEAWAY_END_MS;
}

function isGiveawayLeadInCampaign(lead) {
  const submittedAt = lead?.receivedAt || lead?.createdAt;
  return Boolean(lead?.eligibleForGiveaway) && isWithinGiveawayCampaign(submittedAt);
}

function getGiveawayState(leads, now = new Date()) {
  const nowTimestamp = now instanceof Date ? now.getTime() : Date.parse(now);
  const giveawayEntries = leads.filter(isGiveawayLeadInCampaign).length;
  const giveawayStarted = Number.isFinite(nowTimestamp) && nowTimestamp >= GIVEAWAY_START_MS;
  const giveawayEnded = Number.isFinite(nowTimestamp) && nowTimestamp > GIVEAWAY_END_MS;
  const giveawayOpen = giveawayStarted && !giveawayEnded;
  const giveawayUnlocked = giveawayEntries >= GIVEAWAY_THRESHOLD;

  return {
    giveawayEntries,
    giveawayStarted,
    giveawayEnded,
    giveawayOpen,
    giveawayUnlocked,
    giveawayActive: giveawayOpen && giveawayUnlocked,
    giveawayThreshold: GIVEAWAY_THRESHOLD,
    giveawayStartsAt: new Date(GIVEAWAY_START_MS).toISOString(),
    giveawayEndsAt: new Date(GIVEAWAY_END_MS).toISOString(),
  };
}

app.get('/api/stats', (_req, res) => {
  const leads = readLeads();
  const giveaway = getGiveawayState(leads);

  res.json({
    totalLeads: leads.length,
    ...giveaway,
  });
});

app.get('/api/giveaway/status', (_req, res) => {
  const leads = readLeads();
  const giveaway = getGiveawayState(leads);

  res.json({
    entryCount: giveaway.giveawayEntries,
    entryTarget: giveaway.giveawayThreshold,
    unlocked: giveaway.giveawayUnlocked,
    campaignOpen: giveaway.giveawayOpen,
    startsAt: giveaway.giveawayStartsAt,
    endsAt: giveaway.giveawayEndsAt,
    pendingReview: 0,
    lastUpdated: new Date().toISOString(),
  });
});

app.post('/api/leads', leadRateLimit, async (req, res) => {
  const body = req.body || {};
  const photoUploads = normalizePhotoUploads(body.photoUploads);

  const cleanLead = {
    firstName: toSafeString(body.firstName),
    phone: toSafeString(body.phone),
    email: toSafeString(body.email),
    address: toSafeString(body.address),
    service: toSafeString(body.service),
    serviceGroup: toSafeString(body.serviceGroup),
    pricingItemCode: toSafeString(body.pricingItemCode),
    lineItems: normalizeLineItems(body.lineItems),
    propertyType: toSafeString(body.propertyType),
    storeys: toSafeString(body.storeys),
    rooms: toSafeString(body.rooms),
    serviceArea: toSafeString(body.serviceArea),
    scopeQuantity: Math.max(0, Number(body.scopeQuantity) || 0),
    scopeUnit: toSafeString(body.scopeUnit),
    scopeDetail: toSafeString(body.scopeDetail),
    accessDifficulty: toSafeString(body.accessDifficulty),
    conditionLevel: toSafeString(body.conditionLevel),
    recurringFrequency: toSafeString(body.recurringFrequency) || 'one_off',
    timingLoading: toSafeString(body.timingLoading) || 'standard',
    travelBand: toSafeString(body.travelBand) || 'within25',
    discountEligibility: toSafeString(body.discountEligibility) || 'None',
    parking: toSafeString(body.parking),
    lastCleaned: toSafeString(body.lastCleaned),
    preferredDate: toSafeString(body.preferredDate),
    preferredTime: toSafeString(body.preferredTime),
    paymentPreference: toSafeString(body.paymentPreference),
    notes: toSafeString(body.notes),
    website: toSafeString(body.website),
    addons: normalizeAddons(body.addons),
    subscriptionPackage: toSafeString(body.subscriptionPackage),
    photoUploadCount: photoUploads.length,
    agree: Boolean(body.agree),
    formElapsedMs: Number(body.formElapsedMs) || 0,
    clientSubmittedAt: toSafeString(body.clientSubmittedAt),
    deliveryTargets: {
      email: BUSINESS_EMAIL,
      commandCentre: COMMAND_CENTRE_NAME,
    },
  };

  const missingField = REQUIRED_FIELDS.find((field) => !cleanLead[field]);
  if (missingField) {
    return res.status(400).json({
      error: `Please complete the required field: ${missingField}.`,
    });
  }

  if (!isValidEmail(cleanLead.email)) {
    return res.status(400).json({
      error: 'Please enter a valid email address.',
    });
  }

  const leads = readLeads();
  const spamError = validateAntiSpam(body, cleanLead, leads);
  if (spamError) {
    return res.status(400).json({
      error: spamError,
    });
  }

  const estimate = estimateLead(cleanLead);
  const aiSummary = generateAISummary(cleanLead, estimate);
  const leadQuality = scoreLeadQuality(cleanLead);
  const eligibleForGiveaway = isWithinGiveawayCampaign() && estimate.recommendedEstimate >= GIVEAWAY_MIN_ESTIMATE;
  const leadId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const savedPhotos = savePhotoUploads(leadId, photoUploads);

  const lead = {
    id: leadId,
    ...cleanLead,
    photoUploads: savedPhotos,
    photoUploadCount: savedPhotos.length,
    estimateMin: estimate.estimateMin,
    estimateMax: estimate.estimateMax,
    estimateMinIncGst: estimate.estimateMinIncGst,
    estimateMaxIncGst: estimate.estimateMaxIncGst,
    recommendedEstimate: estimate.recommendedEstimate,
    recommendedEstimateIncGst: estimate.recommendedEstimateIncGst,
    recommendedEstimateLabel: estimate.recommendedEstimateLabel,
    internalEstimateLabel: estimate.internalEstimateLabel,
    pricingMethod: estimate.pricingMethod,
    estimateLabel: estimate.estimateLabel,
    estimateReasons: estimate.estimateReasons,
    estimatedJobType: estimate.estimatedJobType,
    tailoredQuoteRecommended: estimate.tailoredQuoteRecommended,
    estimateGuidance: estimate.estimateGuidance,
    accuracyLevel: estimate.accuracyLevel,
    manualReviewRequired: estimate.manualReviewRequired,
    photoRequired: estimate.photoRequired,
    calculationBreakdown: estimate.calculationBreakdown,
    internalCalculation: estimate.internalCalculation,
    aiSummary,
    leadQuality,
    eligibleForGiveaway,
    receivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  leads.push(lead);
  writeLeads(leads);

  const emailDispatch = await sendLeadEmail(lead);
  if (!emailDispatch.sent) {
    console.error(`[email] Quote lead ${lead.id} was saved but email delivery failed: ${emailDispatch.message}`);
  }
  queueEmailPayload({
    id: lead.id,
    to: BUSINESS_EMAIL,
    commandCentre: cleanLead.deliveryTargets.commandCentre,
    subject: `New Quote Lead - ${cleanLead.firstName || 'Customer'} - ${cleanLead.service}`,
    createdAt: new Date().toISOString(),
    emailDispatch,
    lead,
  });

  return res.status(201).json({
    lead,
    estimateMin: estimate.estimateMin,
    estimateMax: estimate.estimateMax,
    estimateMinIncGst: estimate.estimateMinIncGst,
    estimateMaxIncGst: estimate.estimateMaxIncGst,
    recommendedEstimate: estimate.recommendedEstimate,
    recommendedEstimateIncGst: estimate.recommendedEstimateIncGst,
    recommendedEstimateLabel: estimate.recommendedEstimateLabel,
    internalEstimateLabel: estimate.internalEstimateLabel,
    pricingMethod: estimate.pricingMethod,
    estimateLabel: estimate.estimateLabel,
    estimateReasons: estimate.estimateReasons,
    estimatedJobType: estimate.estimatedJobType,
    tailoredQuoteRecommended: estimate.tailoredQuoteRecommended,
    estimateGuidance: estimate.estimateGuidance,
    accuracyLevel: estimate.accuracyLevel,
    manualReviewRequired: estimate.manualReviewRequired,
    photoRequired: estimate.photoRequired,
    calculationBreakdown: estimate.calculationBreakdown,
    aiSummary,
    leadQuality,
    eligibleForGiveaway,
    deliveryStatus: {
      email: emailDispatch.sent ? `Sent to ${BUSINESS_EMAIL}` : `Queued for ${BUSINESS_EMAIL} (${emailDispatch.message})`,
      commandCentre: 'Saved to T & A Command Centre',
      attachmentsSaved: savedPhotos.length,
    },
  });
});

app.post('/api/referrals', leadRateLimit, async (req, res) => {
  const body = parsePayload(req.body || {});
  const photoUploads = normalizePhotoUploads(body.photoUploads);

  const referral = {
    id: makeSubmissionId('referral'),
    type: 'referral',
    referrer: {
      fullName: toSafeString(body.referrer?.fullName),
      phone: toSafeString(body.referrer?.phone),
      email: toSafeString(body.referrer?.email),
      businessName: toSafeString(body.referrer?.businessName),
      abn: toSafeString(body.referrer?.abn),
      preferredPaymentMethod: toSafeString(body.referrer?.preferredPaymentMethod),
      paymentNotes: toSafeString(body.referrer?.paymentNotes),
    },
    customer: {
      fullName: toSafeString(body.customer?.fullName),
      phone: toSafeString(body.customer?.phone),
      email: toSafeString(body.customer?.email),
      address: toSafeString(body.customer?.address),
      suburb: toSafeString(body.customer?.suburb),
      postcode: toSafeString(body.customer?.postcode),
      bestContactTime: toSafeString(body.customer?.bestContactTime),
    },
    job: {
      serviceNeeded: toSafeString(body.job?.serviceNeeded),
      propertyType: toSafeString(body.job?.propertyType),
      urgency: toSafeString(body.job?.urgency),
      estimatedJobValueExGst: Number(body.job?.estimatedJobValueExGst) || null,
      estimatedCommission: Number(body.job?.estimatedCommission) || null,
      notes: toSafeString(body.job?.notes),
    },
    consent: {
      customerPermission: Boolean(body.consent?.customerPermission),
      commissionTermsAccepted: Boolean(body.consent?.commissionTermsAccepted),
      referralTermsAccepted: Boolean(body.consent?.referralTermsAccepted),
      wantsStatusUpdates: Boolean(body.consent?.wantsStatusUpdates),
    },
    meta: {
      source: toSafeString(body.meta?.source) || 'referrals.html',
      submittedAt: toSafeString(body.meta?.submittedAt),
      userAgent: toSafeString(body.meta?.userAgent),
    },
    deliveryTargets: {
      email: BUSINESS_EMAIL,
      commandCentre: COMMAND_CENTRE_NAME,
    },
    createdAt: new Date().toISOString(),
  };

  const validationError = validateReferralSubmission(referral);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  referral.photoUploads = savePhotoUploads(referral.id, photoUploads);
  referral.photoUploadCount = referral.photoUploads.length;

  const referrals = readSubmissions('referrals.json');
  referrals.push(referral);
  writeSubmissions('referrals.json', referrals);

  const emailDispatch = await sendReferralEmail(referral);
  if (!emailDispatch.sent) {
    console.error(`[email] Referral ${referral.id} was saved but email delivery failed: ${emailDispatch.message}`);
  }
  queueEmailPayload({
    id: referral.id,
    to: BUSINESS_EMAIL,
    commandCentre: COMMAND_CENTRE_NAME,
    subject: `New Referral - ${referral.referrer.fullName} for ${referral.customer.fullName}`,
    createdAt: new Date().toISOString(),
    emailDispatch,
    referral,
  });

  return res.status(201).json({
    referral,
    deliveryStatus: {
      email: emailDispatch.sent ? `Sent to ${BUSINESS_EMAIL}` : `Queued for ${BUSINESS_EMAIL} (${emailDispatch.message})`,
      commandCentre: 'Saved to T & A Command Centre',
      attachmentsSaved: referral.photoUploadCount,
    },
  });
});

app.post('/api/subscriptions', leadRateLimit, async (req, res) => {
  const body = parsePayload(req.body || {});
  const photoUploads = normalizePhotoUploads(body.photoUploads);

  const subscription = {
    id: makeSubmissionId('subscription'),
    type: 'subscription_builder',
    plan: body.plan && typeof body.plan === 'object' ? body.plan : {},
    customer: body.customer && typeof body.customer === 'object' ? body.customer : {},
    property: body.property && typeof body.property === 'object' ? body.property : {},
    access: body.access && typeof body.access === 'object' ? body.access : {},
    services: Array.isArray(body.services) ? body.services : [],
    addOns: body.addOns && typeof body.addOns === 'object' ? body.addOns : {},
    apartmentBalcony: body.apartmentBalcony && typeof body.apartmentBalcony === 'object' ? body.apartmentBalcony : {},
    scheduling: body.scheduling && typeof body.scheduling === 'object' ? body.scheduling : {},
    billing: body.billing && typeof body.billing === 'object' ? body.billing : {},
    giveaway: body.giveaway && typeof body.giveaway === 'object' ? body.giveaway : {},
    notes: toSafeString(body.notes),
    photos: Array.isArray(body.photos) ? body.photos.map((item) => toSafeString(item)).filter(Boolean) : [],
    meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
    deliveryTargets: {
      email: BUSINESS_EMAIL,
      commandCentre: COMMAND_CENTRE_NAME,
    },
    createdAt: new Date().toISOString(),
  };

  const validationError = validateSubscriptionSubmission(subscription);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  subscription.photoUploads = savePhotoUploads(subscription.id, photoUploads);
  subscription.photoUploadCount = subscription.photoUploads.length;

  const subscriptions = readSubmissions('subscriptions.json');
  subscriptions.push(subscription);
  writeSubmissions('subscriptions.json', subscriptions);

  const emailDispatch = await sendSubscriptionEmail(subscription);
  if (!emailDispatch.sent) {
    console.error(`[email] Subscription ${subscription.id} was saved but email delivery failed: ${emailDispatch.message}`);
  }
  queueEmailPayload({
    id: subscription.id,
    to: BUSINESS_EMAIL,
    commandCentre: COMMAND_CENTRE_NAME,
    subject: `New Subscription Request - ${toSafeString(subscription.customer.fullName)} - ${toSafeString(subscription.plan.selectedPlan)}`,
    createdAt: new Date().toISOString(),
    emailDispatch,
    subscription,
  });

  return res.status(201).json({
    subscription,
    deliveryStatus: {
      email: emailDispatch.sent ? `Sent to ${BUSINESS_EMAIL}` : `Queued for ${BUSINESS_EMAIL} (${emailDispatch.message})`,
      commandCentre: 'Saved to T & A Command Centre',
      attachmentsSaved: subscription.photoUploadCount,
    },
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  startDailyBackupScheduler(readLeads);
  console.log(`Backend running on http://localhost:${port}`);
});
