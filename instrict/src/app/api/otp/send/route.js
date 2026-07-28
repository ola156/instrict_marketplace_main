import { NextResponse } from 'next/server';
import axios from 'axios';

const SENDCHAMP_API_KEY = process.env.SENDCHAMP_API_KEY;
const BASE_URL = 'https://api.sendchamp.com/api/v1';

export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    if (!SENDCHAMP_API_KEY) {
      console.error('SendChamp Error: SENDCHAMP_API_KEY is not defined in environment variables.');
      return NextResponse.json({ error: 'SMS service configuration missing.' }, { status: 500 });
    }

    const cleanedPhone = phone.replace(/^\+/, '');

    const sendchampRes = await axios.post(
      `${BASE_URL}/verification/create`,
      {
        channel: 'whatsapp',
        sender: 'Sendchamp',
        token_type: 'numeric',
        token_length: 6,
        expiration_time: 5,
        customer_mobile_number: cleanedPhone,
        meta_data: {},
      },
      {
        headers: {
          Authorization: `Bearer ${SENDCHAMP_API_KEY.trim()}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const data = sendchampRes.data;

    if (data.code !== 'success' && data.code !== 200) {
      const rawMessage = data.message || 'Failed to send verification code.';
      const isInsufficientBalance = /balance|insufficient|fund|wallet/i.test(rawMessage);

      return NextResponse.json(
        {
          error: isInsufficientBalance ? 'insufficient_balance' : rawMessage,
          message: rawMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      reference: data.data.reference || data.data.verification_reference,
    });
  } catch (err) {
    const responseData = err.response?.data;
    const rawMessage = responseData?.message || err.message || 'Failed to send verification code.';
    const isInsufficientBalance = /balance|insufficient|fund|wallet/i.test(rawMessage);

    console.error('SendChamp API Error:', responseData || err.message);

    // Map vendor status 407 to 401 to prevent browser net::ERR_UNEXPECTED_PROXY_AUTH
    const rawStatus = err.response?.status;
    const httpStatus = rawStatus === 407 ? 401 : rawStatus || 500;

    return NextResponse.json(
      {
        error: isInsufficientBalance ? 'insufficient_balance' : rawMessage,
        message: rawMessage,
      },
      { status: httpStatus }
    );
  }
}