import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const DEFAULT_EMAIL = 'tandaprocleaning@gmail.com';
const EMAIL_CONNECTION_TIMEOUT_MS = 8_000;
const EMAIL_SOCKET_TIMEOUT_MS = 12_000;
const EMAIL_SEND_TIMEOUT_MS = 15_000;

function toText(value) {
  return String(value ?? '').trim();
}

function toList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => toText(item)).filter(Boolean);
}

function boolLabel(value) {
  return value ? 'Yes' : 'No';
}

function buildEmailTransport() {
  const smtpHost = toText(process.env.SMTP_HOST);
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const smtpUser = toText(process.env.SMTP_USER) || DEFAULT_EMAIL;
  const smtpPass = toText(process.env.SMTP_PASS);
  const gmailAppPassword = toText(process.env.GMAIL_APP_PASSWORD);

  if (smtpHost && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: smtpSecure,
      connectionTimeout: EMAIL_CONNECTION_TIMEOUT_MS,
      greetingTimeout: EMAIL_CONNECTION_TIMEOUT_MS,
      socketTimeout: EMAIL_SOCKET_TIMEOUT_MS,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  if (gmailAppPassword) {
    return nodemailer.createTransport({
      service: 'gmail',
      connectionTimeout: EMAIL_CONNECTION_TIMEOUT_MS,
      greetingTimeout: EMAIL_CONNECTION_TIMEOUT_MS,
      socketTimeout: EMAIL_SOCKET_TIMEOUT_MS,
      auth: {
        user: smtpUser,
        pass: gmailAppPassword,
      },
    });
  }

  return null;
}

async function sendMailWithDeadline(transporter, options) {
  let timeoutId;

  try {
    return await Promise.race([
      transporter.sendMail(options),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Email delivery timed out. The submission was saved for follow-up.'));
        }, EMAIL_SEND_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
    if (typeof transporter.close === 'function') {
      transporter.close();
    }
  }
}

function getAttachmentList(photoUploads = []) {
  return photoUploads
    .map((photo) => {
      const storedPath = toText(photo?.storedPath);
      const absolute = storedPath
        ? path.resolve(process.cwd(), 'data', storedPath)
        : '';
      if (!absolute || !fs.existsSync(absolute)) {
        return null;
      }

      return {
        filename: toText(photo?.name) || path.basename(absolute),
        path: absolute,
      };
    })
    .filter(Boolean);
}

function buildLeadText(lead) {
  const addons = toList(lead?.addons);
  const reasons = toList(lead?.estimateReasons);
  const calculation = lead?.calculationBreakdown && typeof lead.calculationBreakdown === 'object' ? lead.calculationBreakdown : {};
  const pricedLines = Array.isArray(calculation.lines) ? calculation.lines : [];
  const pricedLineText = pricedLines.length
    ? pricedLines.map((line) => `${formatStructuredValue(line.quantity)} ${toText(line.unitLabel)} - ${toText(line.label)} @ ${formatStructuredValue(line.unitRateExGst)} ex GST = ${formatStructuredValue(line.subtotalExGst)} ex GST`).join(' | ')
    : 'None';

  const lines = [
    'New T & A Pro Cleaning Quote Lead',
    '',
    `Lead ID: ${toText(lead?.id)}`,
    `Submitted: ${toText(lead?.createdAt)}`,
    '',
    'Customer',
    `- First name: ${toText(lead?.firstName)}`,
    `- Phone: ${toText(lead?.phone)}`,
    `- Address/Suburb: ${toText(lead?.address)}`,
    '',
    'Quote Inputs',
    `- Service: ${toText(lead?.service)}`,
    `- Pricing item code: ${toText(lead?.pricingItemCode)}`,
    `- Priced line items: ${pricedLineText}`,
    `- Property type: ${toText(lead?.propertyType)}`,
    `- Stories: ${toText(lead?.storeys)}`,
    `- Rooms: ${toText(lead?.rooms)}`,
    `- Service area: ${toText(lead?.serviceArea)}`,
    `- Measured quantity: ${Number(lead?.scopeQuantity || 0) > 0 ? `${Number(lead.scopeQuantity)} ${toText(lead?.scopeUnit)}` : 'Not supplied'}`,
    `- Surface/scope detail: ${toText(lead?.scopeDetail) || 'Not supplied'}`,
    `- Access: ${toText(lead?.accessDifficulty)}`,
    `- Condition: ${toText(lead?.conditionLevel)}`,
    `- Recurring frequency: ${toText(lead?.recurringFrequency)}`,
    `- Timing loading: ${toText(lead?.timingLoading)}`,
    `- Travel band: ${toText(lead?.travelBand)}`,
    `- Last cleaned: ${toText(lead?.lastCleaned)}`,
    `- Parking: ${toText(lead?.parking)}`,
    `- Payment preference: ${toText(lead?.paymentPreference)}`,
    `- Discount eligibility: ${toText(lead?.discountEligibility)}`,
    `- Preferred date: ${toText(lead?.preferredDate)}`,
    `- Preferred time: ${toText(lead?.preferredTime)}`,
    `- Subscription package: ${toText(lead?.subscriptionPackage)}`,
    `- Terms accepted: ${boolLabel(Boolean(lead?.agree))}`,
    '',
    `Add-ons: ${addons.length ? addons.join(', ') : 'None'}`,
    `Customer notes: ${toText(lead?.notes) || 'None'}`,
    '',
    'Smart Estimate',
    `- Recommended estimate: ${toText(lead?.recommendedEstimateLabel || lead?.estimateLabel)}`,
    `- Internal confidence band: ${toText(lead?.internalEstimateLabel)}`,
    `- Pricing method: ${toText(lead?.pricingMethod)}`,
    `- Subtotal ex GST: ${formatStructuredValue(calculation.subtotalExGst)}`,
    `- GST: ${formatStructuredValue(calculation.gst)}`,
    `- Total incl. GST: ${formatStructuredValue(calculation.totalIncGst)}`,
    `- Manual review required: ${boolLabel(Boolean(lead?.manualReviewRequired))}`,
    `- Photos required: ${boolLabel(Boolean(lead?.photoRequired))}`,
    `- Accuracy level: ${toText(lead?.accuracyLevel)}`,
    `- Estimated job type: ${toText(lead?.estimatedJobType)}`,
    `- Tailored quote recommended: ${boolLabel(Boolean(lead?.tailoredQuoteRecommended))}`,
    `- Lead quality: ${toText(lead?.leadQuality)}`,
    `- Giveaway eligible: ${boolLabel(Boolean(lead?.eligibleForGiveaway))}`,
    `- AI summary: ${toText(lead?.aiSummary)}`,
    '',
    `Estimate reasons: ${reasons.length ? reasons.join(' | ') : 'None'}`,
    `Saved photos: ${Number(lead?.photoUploadCount || 0)}`,
  ];

  return lines.join('\n');
}

function formatStructuredValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'None';
  }
  if (typeof value === 'boolean') {
    return boolLabel(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'None';
  }
  return toText(value) || 'None';
}

function labelFromKey(key) {
  return toText(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function appendStructuredLines(lines, value, depth = 0) {
  if (value === null || value === undefined) {
    return;
  }

  const indent = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) {
      lines.push(`${indent}- None`);
      return;
    }

    value.forEach((item) => {
      if (item && typeof item === 'object') {
        lines.push(`${indent}-`);
        appendStructuredLines(lines, item, depth + 1);
      } else {
        lines.push(`${indent}- ${formatStructuredValue(item)}`);
      }
    });
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (key === 'photoUploads' || key === 'uploadWarnings') {
        return;
      }

      const label = labelFromKey(key);
      if (item && typeof item === 'object') {
        lines.push(`${indent}${label}:`);
        appendStructuredLines(lines, item, depth + 1);
      } else {
        lines.push(`${indent}${label}: ${formatStructuredValue(item)}`);
      }
    });
  }
}

function buildStructuredSubmissionText(title, submission) {
  const lines = [
    title,
    '',
    `Submission ID: ${toText(submission?.id)}`,
    `Submitted: ${toText(submission?.createdAt) || toText(submission?.meta?.submittedAt)}`,
    '',
  ];

  appendStructuredLines(lines, submission);
  lines.push('', `Saved photos: ${Number(submission?.photoUploadCount || 0)}`);
  return lines.join('\n');
}

async function sendStructuredSubmissionEmail({ title, subject, submission, photoUploads }) {
  const transporter = buildEmailTransport();
  if (!transporter) {
    return {
      sent: false,
      message: 'SMTP is not configured. Set SMTP or Gmail app-password env vars to enable email sending.',
    };
  }

  const to = toText(process.env.QUOTE_TO_EMAIL) || DEFAULT_EMAIL;
  const from = toText(process.env.QUOTE_FROM_EMAIL) || toText(process.env.SMTP_USER) || DEFAULT_EMAIL;
  const text = buildStructuredSubmissionText(title, submission);
  const attachments = getAttachmentList(photoUploads);

  try {
    const result = await sendMailWithDeadline(transporter, {
      from,
      to,
      subject,
      text,
      attachments,
    });

    return {
      sent: true,
      messageId: toText(result?.messageId),
      message: `Email sent to ${to}`,
    };
  } catch (error) {
    return {
      sent: false,
      message: error instanceof Error ? error.message : 'Unknown email send error.',
    };
  }
}

export async function sendLeadEmail(lead) {
  const transporter = buildEmailTransport();
  if (!transporter) {
    return {
      sent: false,
      message: 'SMTP is not configured. Set SMTP or Gmail app-password env vars to enable email sending.',
    };
  }

  const to = toText(process.env.QUOTE_TO_EMAIL) || DEFAULT_EMAIL;
  const from = toText(process.env.QUOTE_FROM_EMAIL) || toText(process.env.SMTP_USER) || DEFAULT_EMAIL;
  const subject = `New Quote Lead - ${toText(lead?.firstName) || 'Customer'} - ${toText(lead?.service) || 'Service'}`;
  const text = buildLeadText(lead);
  const attachments = getAttachmentList(lead?.photoUploads);

  try {
    const result = await sendMailWithDeadline(transporter, {
      from,
      to,
      subject,
      text,
      attachments,
    });

    return {
      sent: true,
      messageId: toText(result?.messageId),
      message: `Email sent to ${to}`,
    };
  } catch (error) {
    return {
      sent: false,
      message: error instanceof Error ? error.message : 'Unknown email send error.',
    };
  }
}

export async function sendReferralEmail(referral) {
  const referrer = toText(referral?.referrer?.fullName) || 'Referrer';
  const customer = toText(referral?.customer?.fullName) || 'Customer';
  return sendStructuredSubmissionEmail({
    title: 'New T & A Pro Cleaning Referral Submission',
    subject: `New Referral - ${referrer} for ${customer}`,
    submission: referral,
    photoUploads: referral?.photoUploads,
  });
}

export async function sendSubscriptionEmail(subscription) {
  const customer = toText(subscription?.customer?.fullName) || 'Customer';
  const plan = toText(subscription?.plan?.selectedPlan) || 'Subscription';
  return sendStructuredSubmissionEmail({
    title: 'New T & A Pro Cleaning Subscription Builder Request',
    subject: `New Subscription Request - ${customer} - ${plan}`,
    submission: subscription,
    photoUploads: subscription?.photoUploads,
  });
}
