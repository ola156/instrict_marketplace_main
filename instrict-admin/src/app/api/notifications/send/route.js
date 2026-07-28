import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminMessaging } from '@/lib/firebaseAdmin';

// Service-role client — bypasses RLS, needed to read fcm_token across
// all users regardless of who's making the request. This route should
// only ever be called from the admin panel, behind your admin auth check.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_TABLES = {
  students: ['student_profiles'],
  riders: ['rider_profiles'],
  vendors: ['vendor_profiles'],
  all: ['student_profiles', 'rider_profiles', 'vendor_profiles'],
};

async function getTokensForCategory(category) {
  const tables = CATEGORY_TABLES[category];
  if (!tables) return [];

  const results = await Promise.all(
    tables.map((table) =>
      supabaseAdmin.from(table).select('fcm_token').not('fcm_token', 'is', null)
    )
  );

  const tokens = results.flatMap((r) => (r.data || []).map((row) => row.fcm_token));
  // De-dupe in case a token somehow appears twice
  return [...new Set(tokens)].filter(Boolean);
}

export async function POST(request) {
  try {
    const { title, body, category } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }
    if (!CATEGORY_TABLES[category]) {
      return NextResponse.json(
        { error: `category must be one of: ${Object.keys(CATEGORY_TABLES).join(', ')}` },
        { status: 400 }
      );
    }

    const tokens = await getTokensForCategory(category);

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No tokens found for this category' });
    }

    // FCM's multicast endpoint caps at 500 tokens per call, so batch it.
    const BATCH_SIZE = 500;
    let sent = 0;
    let failed = 0;
    const invalidTokens = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const response = await adminMessaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code || '';
          // These two codes mean the token is dead and should be cleared
          // out of the DB so we stop trying to send to it.
          if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
            invalidTokens.push(batch[idx]);
          }
        }
      });
    }

    if (invalidTokens.length > 0) {
      await Promise.all(
        Object.values(CATEGORY_TABLES.all).map((table) =>
          supabaseAdmin.from(table).update({ fcm_token: null }).in('fcm_token', invalidTokens)
        )
      );
    }

    return NextResponse.json({ sent, failed, totalTokens: tokens.length });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}