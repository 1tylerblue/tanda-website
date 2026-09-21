import fs from 'node:fs';
import path from 'node:path';
import policy from '../../giveaway-policy.js';
// Run on the backend host only, after a staff member verifies payment in Square/bank records.
// No personal names, card data or credentials are required.
const [bookingId, status, method, total, paid, paidAt] = process.argv.slice(2);
if (!/^[A-Za-z0-9_-]{3,100}$/.test(bookingId||'') || !['paid','refunded','cancelled'].includes(status) || !['standard','afterpay'].includes(method)) throw new Error('Usage: node scripts/record-giveaway-payment.mjs BOOKING_ID paid|refunded|cancelled standard|afterpay FINAL_CENTS PAID_CENTS ISO_PAID_AT');
const record={bookingId,status,method,finalDiscountedIncGstCents:Number(total),paidCents:Number(paid),paidAt,verifiedAt:new Date().toISOString()};
if (!Number.isSafeInteger(record.finalDiscountedIncGstCents)||!Number.isSafeInteger(record.paidCents)||record.finalDiscountedIncGstCents<0||record.paidCents<0||!Number.isFinite(Date.parse(paidAt))) throw new Error('Amounts must be non-negative integer cents and payment time must be an ISO date.');
const file=path.resolve('data/giveaway-payments.json');
fs.mkdirSync(path.dirname(file),{recursive:true});
const entries=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
const updated=entries.filter(entry=>entry.bookingId!==bookingId).concat(record);
fs.writeFileSync(file+'.tmp',JSON.stringify(updated,null,2));fs.renameSync(file+'.tmp',file);
console.log('Payment record saved. Entry qualifies:',policy.qualifies(record));
