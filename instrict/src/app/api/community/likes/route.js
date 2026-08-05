import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPushToTokens } from '@/lib/sendPush';

const PROFILE_TABLE = {
  student: 'student_profiles',
  vendor: 'vendor_profiles',
  rider: 'rider_profiles',
};

export async function POST(req) {
  const { postId, likerType } = await req.json();

  if (!postId || !likerType) {
    return NextResponse.json({ error: 'Missing postId or likerType' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // toggle_post_like is SECURITY DEFINER and already handles the
  // notifications row insert for a new like (added in the earlier
  // migration) — this route only adds the push on top of that.
  const { data: likes, error } = await supabase.rpc('toggle_post_like', {
    post_id: postId,
    liker_type: likerType,
  });

  if (error) {
    console.error('[likes] toggle error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A toggle either adds or removes — if the caller's id is present in the
  // result, this call just added it (it can't have been there before a
  // toggle that just ran). Only push on add, never on unlike.
  const justLiked = Array.isArray(likes) && likes.some((l) => l.id === user.id);
  if (justLiked) {
    notifyPostAuthorOfLike(postId, user.id).catch((err) =>
      console.error('[push] like notify error:', err)
    );
  }

  return NextResponse.json({ likes });
}

async function notifyPostAuthorOfLike(postId, likerId) {
  const admin = createAdminClient();

  const { data: post } = await admin
    .from('community_posts')
    .select('author_id, author_type')
    .eq('id', postId)
    .maybeSingle();

  if (!post || post.author_id === likerId) return; // don't push for liking your own post

  const table = PROFILE_TABLE[post.author_type] || 'student_profiles';
  const { data: profile } = await admin
    .from(table)
    .select('fcm_token')
    .eq('user_id', post.author_id)
    .maybeSingle();

  if (!profile?.fcm_token) return;

  await sendPushToTokens(
    admin,
    [profile.fcm_token],
    { title: 'Someone liked your post', body: 'Tap to see who liked your post.' },
    table
  );
}