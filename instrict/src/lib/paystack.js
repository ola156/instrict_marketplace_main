const PAYSTACK_BASE = 'https://api.paystack.co';

export async function initializeTransaction({ email, amountKobo, reference, metadata, callback_url }) {
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: amountKobo, reference, callback_url, metadata }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Paystack initialize failed');
  return data.data;
}

export async function verifyTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Paystack verify failed');
  return data.data; // { status: 'success' | 'failed' | ..., amount, reference, ... }
}