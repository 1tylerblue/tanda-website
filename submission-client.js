(function(root) {
  'use strict';
  const pending = new Set();
  const memory = new Map();
  function read(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return memory.get(key); } }
  function write(key, value) { memory.set(key, value); try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function stablePayload(payload) {
    const clean = { ...payload };
    delete clean.formElapsedMs; delete clean.clientSubmittedAt; delete clean.idempotencyKey;
    if (clean.meta) { clean.meta = { ...clean.meta }; delete clean.meta.submittedAt; }
    return JSON.stringify(clean);
  }
  async function submit(url, payload, timeoutMs = 45000) {
    if (pending.has(url)) throw new Error('Your request is already being sent.');
    pending.add(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const signature = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stablePayload(payload))))).map(n => n.toString(16).padStart(2,'0')).join('');
      const key = 'ta_submission_' + url;
      let receipt = read(key);
      if (!receipt || receipt.signature !== signature) { receipt = { signature, id: crypto.randomUUID() }; write(key, receipt); }
      const response = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ...payload, idempotencyKey: receipt.id }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your request could not be saved. Please retry.');
      if (!result.lead?.id && !result.subscription?.id) throw new Error('The server did not confirm capture. Please retry.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The connection timed out. Your details are preserved. Please retry; the same request will not be saved twice.');
      throw error;
    } finally { clearTimeout(timer); pending.delete(url); }
  }
  function once(id, callback) {
    const key = 'ta_conversion_' + id;
    if (read(key)) return;
    callback(); write(key, true);
  }
  root.TASubmissions = { submit, once };
})(window);
