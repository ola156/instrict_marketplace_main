const PAYSTACK_BASE = 'https://api.paystack.co';

// ... your existing initializeTransaction / verifyTransaction stay as-is ...

export async function createTransferRecipient({ name, account_number, bank_code }) {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'nuban', name, account_number, bank_code, currency: 'NGN' }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Could not create transfer recipient');
  return data.data; // { recipient_code, ... }
}

export async function initiateTransfer({ amountKobo, recipientCode, reference, reason }) {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reference,
      reason,
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Transfer failed to initiate');
  return data.data; // { transfer_code, status: 'success' | 'pending' | 'otp', ... }
}