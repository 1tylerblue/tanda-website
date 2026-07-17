import fs from 'fs';
import path from 'path';

const BACKUP_TIMEZONE = 'Australia/Brisbane';
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getDateStamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BACKUP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function toCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCsv(value) {
  const text = toCell(value).replace(/"/g, '""');
  return `"${text}"`;
}

function toCsv(leads) {
  const rows = Array.isArray(leads) ? leads : [];
  if (!rows.length) {
    return 'id,createdAt,firstName,phone,address,service,propertyType,storeys,rooms,serviceArea,estimateLabel,leadQuality,eligibleForGiveaway';
  }

  const headers = [
    'id',
    'createdAt',
    'firstName',
    'phone',
    'address',
    'service',
    'propertyType',
    'storeys',
    'rooms',
    'serviceArea',
    'estimateLabel',
    'leadQuality',
    'eligibleForGiveaway',
    'addons',
    'notes',
  ];

  const lines = [headers.join(',')];
  rows.forEach((lead) => {
    const line = headers.map((header) => escapeCsv(lead?.[header]));
    lines.push(line.join(','));
  });
  return lines.join('\n');
}

function cleanupOldBackups(backupDir, keepDays = 60) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(backupDir, { withFileTypes: true });

  files.forEach((entry) => {
    if (!entry.isFile()) {
      return;
    }
    const fullPath = path.join(backupDir, entry.name);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // Ignore cleanup errors.
    }
  });
}

export function writeDailyLeadBackup(leads, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const stamp = getDateStamp(now);
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  ensureDir(backupDir);

  const jsonPath = path.join(backupDir, `leads-${stamp}.json`);
  const csvPath = path.join(backupDir, `leads-${stamp}.csv`);
  const safeLeads = Array.isArray(leads) ? leads : [];

  fs.writeFileSync(jsonPath, JSON.stringify(safeLeads, null, 2));
  fs.writeFileSync(csvPath, toCsv(safeLeads));
  cleanupOldBackups(backupDir, 60);

  return {
    date: stamp,
    jsonPath,
    csvPath,
    records: safeLeads.length,
  };
}

export function startDailyBackupScheduler(readLeads) {
  let lastStamp = '';

  const run = () => {
    try {
      const now = new Date();
      const currentStamp = getDateStamp(now);
      if (currentStamp === lastStamp) {
        return;
      }
      const leads = typeof readLeads === 'function' ? readLeads() : [];
      writeDailyLeadBackup(leads, { now });
      lastStamp = currentStamp;
    } catch {
      // Keep scheduler alive even if backup write fails.
    }
  };

  run();
  const timer = setInterval(run, CHECK_INTERVAL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  return timer;
}
