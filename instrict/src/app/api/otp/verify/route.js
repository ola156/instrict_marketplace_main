import { NextResponse } from 'next/server';
import axios from 'axios';

const SENDCHAMP_API_KEY = process.env.SENDCHAMP_API_KEY;
const BASE_URL = 'https://api.sendchamp.com/api/v1';

export async function POST(request) {
  try {
    const { reference, code } = await request.json();

    if (!reference || !code) {
      return NextResponse.json({ error: 'Reference and code are required.' }, { status: 400 });
    }

    if (!SENDCHAMP_API_KEY) {
      return NextResponse.json({ error: 'API key not configured.' }, { status: 500 });
    }

    const cleanKey = SENDCHAMP_API_KEY.replace(/\\/g, '').trim();

    const sendchampRes = await axios.post(
      `${BASE_URL}/verification/confirm`,
      {
        verification_reference: String(reference).trim(),
        verification_code: String(code).trim(),
        verification_otp: String(code).trim(), // Included for API compatibility
      },
      {
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const data = sendchampRes.data;

    if (data.status === 'success' || data.code === 200) {
      return NextResponse.json({ success: true, message: 'OTP verified successfully' });
    }

    return NextResponse.json(
      { error: data.message || 'Incorrect or expired code.' },
      { status: 400 }
    );
  } catch (err) {
    const responseData = err.response?.data;
    console.error('SendChamp confirm OTP error:', responseData || err.message);

    const rawMessage = responseData?.message || 'Verification failed. Please try again.';
    const rawStatus = err.response?.status;

    return NextResponse.json(
      { error: rawMessage },
      { status: rawStatus === 407 ? 401 : rawStatus || 500 }
    );
  }
}