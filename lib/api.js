const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateClientReference(now = new Date()) {
  const btt = new Date(now.getTime() + 6 * 3600 * 1000);
  const stamp = btt.toISOString().slice(0, 10).replace(/-/g, '');
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `YBT-${stamp}-${code}`;
}

function saveLocalEnquiry(payload, reference) {
  try {
    const key = 'yuevaan_saved_inquiries';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      ...payload,
      reference,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(-50)));
  } catch {}
}

export async function submitEnquiry(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.ok) {
      return data;
    }

    // In `next dev` (localhost:3000) or static preview without server.js, /api/inquiries returns 404/405
    if (response.status === 404 || response.status === 405) {
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        const host = window.location.hostname;
        const candidatePorts = ['8081', '8080'].filter((p) => p !== window.location.port);
        for (const p of candidatePorts) {
          try {
            const fallbackRes = await fetch(`http://${host}:${p}/api/inquiries`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            const fallbackData = await fallbackRes.json().catch(() => null);
            if (fallbackRes.ok && fallbackData?.ok) {
              return fallbackData;
            }
          } catch {}
        }
      }
      const ref = generateClientReference();
      saveLocalEnquiry(payload, ref);
      return { ok: true, reference: ref, deliveryMode: 'client' };
    }

    const err = new Error(data?.error?.message || 'Unable to send your request right now.');
    err.code = data?.error?.code || 'REQUEST_FAILED';
    err.field = data?.error?.field || null;
    err.status = response.status;
    throw err;
  } catch (err) {
    if (err.status && err.status !== 404 && err.status !== 405) {
      throw err;
    }
    const ref = generateClientReference();
    saveLocalEnquiry(payload, ref);
    return { ok: true, reference: ref, deliveryMode: 'client' };
  } finally {
    clearTimeout(timer);
  }
}
