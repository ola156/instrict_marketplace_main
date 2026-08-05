'use client';

// Reusable across every actor type — mount as:
//   <CommunityFeed authorType="student" />   (student portal)
//   <CommunityFeed authorType="vendor" />     (vendor portal)
//   <CommunityFeed authorType="rider" />      (rider portal, e.g. under profile/menu)
//
// Realtime: new posts, likes, and deletes now broadcast to every open
// feed via Supabase's postgres_changes, instead of only refreshing for
// whoever took the action. Comment threads subscribe the same way, but
// only while that specific thread is expanded — no point paying for a
// subscription per post when most of them are collapsed.
//
// Suspension guard: checked against WHICHEVER profile table matches this
// viewer's own authorType (student/vendor/rider), not the author of any
// given post — a suspended vendor viewing the feed can't post, comment,
// or like, regardless of who wrote what they're looking at.
//
// Likes: stored as jsonb [{id, type}, ...] rather than a bare uuid[] so
// the "liked by" modal can resolve each liker's name without guessing
// which profile table they belong to. toggle_post_like(post_id, liker_type)
// needs the viewer's own authorType passed in for the same reason.

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import VerificationGate from '@/components/verification/VerificationGate';
import { Heart, MessageCircle, Image as ImageIcon, Send, X, Loader2, Trash2, Store, Bike, GraduationCap, Ban } from 'lucide-react';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Every profile table is keyed by user_id = auth.uid(), so author_id on
// posts/comments is always the plain auth user id no matter who posted —
// this map is the only thing that needs to grow if a new actor type
// (e.g. a future admin account) ever needs to post too.
const AUTHOR_PROFILE = {
  student: { table: 'student_profiles', nameField: 'full_name', fallback: 'Student', icon: GraduationCap, badgeClass: 'from-blue-500 to-blue-600' },
  vendor:  { table: 'vendor_profiles',  nameField: 'legal_name', fallback: 'Vendor',  icon: Store,          badgeClass: 'from-emerald-500 to-emerald-600' },
  rider:   { table: 'rider_profiles',   nameField: 'full_name',  fallback: 'Rider',   icon: Bike,           badgeClass: 'from-amber-500 to-amber-600' },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function fetchAuthorName(supabase, authorId, authorType) {
  const config = AUTHOR_PROFILE[authorType] || AUTHOR_PROFILE.student;
  const { data, error } = await supabase.from(config.table).select(config.nameField).eq('user_id', authorId).maybeSingle();
  if (error) console.error(`fetchAuthorName error (${authorType}):`, error);
  return data?.[config.nameField] || config.fallback;
}

function SuspendedBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3.5">
      <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-black text-rose-600 dark:text-rose-400">Your account is suspended</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          You can still read posts, but posting, commenting, and liking are disabled until this is resolved.
        </p>
      </div>
    </div>
  );
}

function LikesModal({ likes, onClose }) {
  const supabase = createClient();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const enriched = await Promise.all(
        (likes || []).map(async (l) => ({
          id: l.id,
          type: l.type,
          name: await fetchAuthorName(supabase, l.id, l.type),
        }))
      );
      setEntries(enriched);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full sm:w-80 sm:rounded-2xl rounded-t-2xl max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <p className="text-xs font-black text-slate-900 dark:text-white">Liked by</p>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-slate-400 animate-spin" /></div>
        ) : (
          <div className="p-2">
            {entries.map(e => {
              const config = AUTHOR_PROFILE[e.type] || AUTHOR_PROFILE.student;
              const RoleIcon = config.icon;
              return (
                <div key={e.id} className="flex items-center gap-2.5 px-2 py-2">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.badgeClass} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-[11px] font-black">{e.name?.[0]?.toUpperCase() || 'U'}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white">{e.name}</p>
                    {e.type !== 'student' && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
                        <RoleIcon className="w-2.5 h-2.5" /> {config.fallback}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {entries.length === 0 && (
              <p className="text-[11px] text-slate-400 text-center py-4">No likes yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, onDelete, onLike, suspended }) {
  const supabase = createClient();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLikes, setShowLikes] = useState(false);

  const liked = post.likes?.some(l => l.id === currentUserId);
  const likeCount = post.likes?.length || 0;
  const displayedCommentCount = showComments ? comments.length : (post.comment_count || 0);
  const config = AUTHOR_PROFILE[post.author_type] || AUTHOR_PROFILE.student;
  const RoleIcon = config.icon;

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchComments error:', error);
      setComments([]);
      setLoadingComments(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (c) => ({
        ...c,
        author_name: await fetchAuthorName(supabase, c.author_id, c.author_type),
      }))
    );

    setComments(enriched);
    setLoadingComments(false);
  };

  const toggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(p => !p);
  };

  // Live comments — only subscribed while this thread is actually open.
  useEffect(() => {
    if (!showComments) return;
    const channel = supabase
      .channel(`community-comments-${post.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments', filter: `post_id=eq.${post.id}` },
        async (payload) => {
          const row = payload.new;
          const author_name = await fetchAuthorName(supabase, row.author_id, row.author_type);
          setComments(prev => (prev.some(c => c.id === row.id) ? prev : [...prev, { ...row, author_name }]));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [showComments, post.id]);

  const submitComment = async () => {
    if (suspended || !commentText.trim() || submitting) return;
    setSubmitting(true);

    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        content: commentText.trim(),
        authorType: post.viewerAuthorType,
      }),
    });
    const { comment: data, error } = await res.json();

    if (error) {
      console.error('submitComment error:', error);
      setSubmitting(false);
      return;
    }

    // Append right away rather than waiting on the realtime listener —
    // that round-trip is what was showing up as "have to refresh."
    // The dedupe check in the realtime handler (prev.some(c => c.id ===
    // row.id)) means it's harmless if that event also arrives shortly
    // after — it just won't add a second copy.
    const author_name = await fetchAuthorName(supabase, data.author_id, data.author_type);
    setComments(prev => (prev.some(c => c.id === data.id) ? prev : [...prev, { ...data, author_name }]));

    setCommentText('');
    setSubmitting(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Author */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.badgeClass} flex items-center justify-center shrink-0`}>
            <span className="text-white text-[11px] font-black">
              {post.author_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-black text-slate-900 dark:text-white">{post.author_name}</p>
              {post.author_type !== 'student' && (
                <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
                  <RoleIcon className="w-2.5 h-2.5" /> {config.fallback}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {post.author_id === currentUserId && (
          <button onClick={() => onDelete(post.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{post.content}</p>
      </div>

      {/* Image */}
      {post.image_url && (
        <img src={post.image_url} alt="Post" className="w-full max-h-80 object-cover" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-50 dark:border-slate-800">
        <button
          onClick={() => onLike(post.id, liked)}
          disabled={suspended}
          className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
        </button>
        {likeCount > 0 && (
          <button
            onClick={() => setShowLikes(true)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors -ml-3"
          >
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </button>
        )}
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {displayedCommentCount > 0 && displayedCommentCount}
        </button>
      </div>

      {showLikes && <LikesModal likes={post.likes} onClose={() => setShowLikes(false)} />}

      {/* Comments */}
      {showComments && (
        <div className="border-t border-slate-50 dark:border-slate-800 px-4 pb-4 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-slate-400 animate-spin" /></div>
          ) : (
            <div className="space-y-2.5 pt-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-black text-slate-500">{c.author_name?.[0]?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">{c.author_name}</p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300">{c.content}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-2">No comments yet. Be the first.</p>
              )}
            </div>
          )}

          {suspended ? (
            <p className="text-[11px] font-bold text-rose-500 text-center pt-1">
              Your account is suspended — you can't comment right now.
            </p>
          ) : (
            <VerificationGate role={post.viewerAuthorType} userId={currentUserId} action="comment">
              <div className="flex gap-2 pt-1">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment()}
                  placeholder="Write a comment…"
                  className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </VerificationGate>
          )}
        </div>
      )}
    </div>
  );
}

function CreatePost({ currentUserId, authorType, onCreated, suspended }) {
  const supabase = createClient();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const handleImage = async (file) => {
    if (suspended || !file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', 'instrict/community');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.secure_url) setImageUrl(data.secure_url);
    setUploading(false);
  };

  const submit = async () => {
    if (suspended || !content.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('community_posts').insert({
      author_id: currentUserId,
      author_type: authorType,
      content: content.trim(),
      image_url: imageUrl || null,
      likes: [],
    });
    if (error) {
      console.error('create post error:', error);
      setSubmitting(false);
      return;
    }
    setContent(''); setImageUrl('');
    onCreated();
    setSubmitting(false);
  };

  if (suspended) {
    return <SuspendedBanner />;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's happening on campus?"
        rows={3}
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
      />

      {imageUrl && (
        <div className="relative">
          <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
          <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-lg flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-500 transition-all">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
        </div>
        <button
          onClick={submit}
          disabled={submitting || !content.trim()}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black transition-all flex items-center gap-1.5"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Post
        </button>
      </div>
    </div>
  );
}

export default function CommunityFeed({ authorType = 'student', highlightPostId: highlightPostIdProp }) {
  const supabase = createClient();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [suspended, setSuspended] = useState(false);

  // Deep-linked from a notification click, e.g. /community?highlight=<post_id>.
  // Read once on mount — if the user navigates within the feed afterward
  // we don't want an old highlight param re-triggering the scroll.
  const searchParams = useSearchParams();
  const [highlightId, setHighlightId] = useState(null);
  const highlightedOnceRef = useRef(false);

  useEffect(() => {
    const id = highlightPostIdProp || searchParams.get('highlight');
    if (id) setHighlightId(id);
  }, [highlightPostIdProp, searchParams]);

  useEffect(() => { init(); }, [authorType]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);

      // Checked against the VIEWER's own profile table (matching authorType),
      // not any post's author — the person looking at the feed is who might
      // be suspended, regardless of who wrote what they're reading.
      const config = AUTHOR_PROFILE[authorType] || AUTHOR_PROFILE.student;
      const { data: profile } = await supabase
        .from(config.table)
        .select('account_status')
        .eq('user_id', user.id)
        .maybeSingle();
      setSuspended(profile?.account_status === 'suspended');
    }
    fetchPosts();
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*, community_comments(count)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('fetchPosts error:', error);
      setLoading(false);
      return;
    }

    // Each post is enriched using ITS OWN author_type, not the viewer's —
    // a student browsing the feed still sees vendor/rider posts labeled
    // and named correctly.
    const enriched = await Promise.all((data || []).map(async post => {
      const { community_comments, ...rest } = post;
      return {
        ...rest,
        comment_count: community_comments?.[0]?.count || 0,
        author_name: await fetchAuthorName(supabase, post.author_id, post.author_type),
        viewerAuthorType: authorType, // used when the current viewer comments on this post
      };
    }));
    setPosts(enriched);
    setLoading(false);
  };

  // Once the highlighted post has actually loaded into `posts`, scroll to
  // it and clear the highlight after a few seconds. Guarded by a ref so a
  // realtime update to `posts` later doesn't re-trigger the scroll.
  useEffect(() => {
    if (!highlightId || highlightedOnceRef.current) return;
    const match = posts.find(p => p.id === highlightId);
    if (!match) return;
    highlightedOnceRef.current = true;
    const el = document.getElementById(`post-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [posts, highlightId]);

  // Realtime: everyone with the feed open sees new posts, likes, and
  // deletes as they happen, not just the person who took the action.
  useEffect(() => {
    const channel = supabase
      .channel('community-posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async (payload) => {
        const row = payload.new;
        const author_name = await fetchAuthorName(supabase, row.author_id, row.author_type);
        setPosts(prev => (prev.some(p => p.id === row.id) ? prev : [{ ...row, author_name, viewerAuthorType: authorType }, ...prev]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, (payload) => {
        const row = payload.new;
        // Merge in the changed columns (likes, content, image_url, etc.)
        // without touching author_name/viewerAuthorType, which aren't
        // real columns and wouldn't be present on the incoming row.
        setPosts(prev => prev.map(p => (p.id === row.id ? { ...p, ...row } : p)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authorType]);

  // Comment counts stay live even when a thread is collapsed — this is
  // deliberately separate from PostCard's own per-thread subscription
  // (which only runs while that thread is open and appends full comment
  // rows). Subscribing to every open thread individually would mean up
  // to 30 channels at once; one shared channel just for counts is cheap.
  useEffect(() => {
    const channel = supabase
      .channel('community-comment-counts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_comments' }, (payload) => {
        const row = payload.new;
        setPosts(prev => prev.map(p => (p.id === row.post_id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_comments' }, (payload) => {
        const row = payload.old;
        setPosts(prev => prev.map(p => (p.id === row.post_id ? { ...p, comment_count: Math.max((p.comment_count || 1) - 1, 0) } : p)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDelete = async (postId) => {
    const { error } = await supabase.from('community_posts').delete().eq('id', postId);
    if (error) {
      console.error('delete post error:', error);
      return;
    }
    // The realtime DELETE listener above will also fire for this, but
    // updating locally right away keeps the UI snappy for the deleter.
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleLike = async (postId) => {
    if (suspended) return;
    // liker_type is required so toggle_post_like can store {id, type} —
    // without it the "liked by" modal wouldn't know which profile table
    // to resolve this liker's name from. Routed through the API (rather
    // than calling the RPC directly) so a new like can trigger a push.
    const res = await fetch('/api/community/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, likerType: authorType }),
    });
    const { likes: data, error } = await res.json();
    if (error) {
      console.error('toggle like error:', error);
      return;
    }
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, likes: data } : p)));
  };

  return (
    <div className="w-full space-y-5 max-w-xl px-4 sm:px-1">
      <div>
        <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Community</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">What's happening on campus</p>
      </div>

      {currentUserId && (
        <VerificationGate role={authorType} userId={currentUserId} action="post in the community">
          <CreatePost currentUserId={currentUserId} authorType={authorType} onCreated={fetchPosts} suspended={suspended} />
        </VerificationGate>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-2 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-4xl mb-3">💬</span>
          <p className="text-xs font-black text-slate-400">No posts yet</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Be the first to post something</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className={highlightId === post.id ? 'ring-2 ring-blue-500 rounded-2xl transition-all' : 'transition-all'}
            >
              <PostCard post={post} currentUserId={currentUserId} onDelete={handleDelete} onLike={handleLike} suspended={suspended} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}