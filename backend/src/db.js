import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'leads.json');

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]');
  }
}

export function readLeads() {
  ensureDbFile();

  try {
    const file = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLeads(leads) {
  ensureDbFile();
  const safeLeads = Array.isArray(leads) ? leads : [];
  fs.writeFileSync(DB_PATH, JSON.stringify(safeLeads, null, 2));
}
