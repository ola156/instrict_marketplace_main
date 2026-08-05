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
  const { postId, content, authorType } = await req.json();

  if (!postId || !content?.trim() || !authorType) {
    return NextResponse.json({ error: 'Missing postId, content, or authorType' }, { status: 400 });
  }

  // Cookie-based client — respects RLS, ties the insert to whoever is
  // actually logged in. This is the ONLY client used for the write itself;
  // the admin client below is only ever used afterward, to read the post
  // author's fcm_token (something the commenter has no RLS access to) and
  // send a push. It never touches the write path.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: comment, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      author_type: authorType,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('[comments] insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget — the in-app notification row is already handled by
  // the notify_post_comment DB trigger. This ONLY sends the push; it must
  // never insert into notifications itself or every comment would create
  // two rows. A push failure must never fail the comment itself.
  notifyPostAuthorOfComment(postId, user.id, content.trim()).catch((err) =>
    console.error('[push] comment notify error:', err)
  );

  return NextResponse.json({ comment });
}

async function notifyPostAuthorOfComment(postId, commenterId, content) {
  const admin = createAdminClient();

  const { data: post } = await admin
    .from('community_posts')
    .select('author_id, author_type')
    .eq('id', postId)
    .maybeSingle();

  if (!post || post.author_id === commenterId) return; // don't push for your own comment on your own post

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
    { title: 'New comment on your post', body: content.slice(0, 140) },
    table
  );
}