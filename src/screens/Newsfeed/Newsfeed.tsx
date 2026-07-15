import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import {
  Heart,
  MessageCircle,
  Camera,
  Flag,
  Trash2,
  Send,
  Loader2,
  X,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface NewsfeedProps {
  onNavigate: (screen: string) => void;
}

interface FeedPost {
  id: number;
  user_id: string;
  caption: string;
  image_urls: string[];
  created_at: string;
  authorName: string;
  authorPhoto: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

interface FeedComment {
  id: number;
  user_id: string;
  body: string;
  created_at: string;
  authorName: string;
}

const PAGE_SIZE = 15;

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Horizontal snap-swipe gallery with position dots. */
const SnapGallery: React.FC<{ urls: string[] }> = ({ urls }) => {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return (
      <img
        src={urls[0]}
        alt="Post photo"
        className="w-full max-h-[420px] object-cover rounded-xl"
        loading="lazy"
      />
    );
  }

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-xl scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {urls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Photo ${i + 1} of ${urls.length}`}
            className="w-full max-h-[420px] object-cover flex-shrink-0 snap-center"
            loading="lazy"
          />
        ))}
      </div>
      <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
        {index + 1}/{urls.length}
      </div>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === index ? 'bg-white' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const Newsfeed: React.FC<NewsfeedProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Composer state
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  // Comments state
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  const enrich = useCallback(
    async (rows: any[]): Promise<FeedPost[]> => {
      if (rows.length === 0) return [];
      const postIds = rows.map((r) => r.id);
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      const [profilesRes, photosRes, likesRes, commentsRes] = await Promise.all([
        supabaseClient
          .from('user_profiles')
          .select('user_id, full_name, first_name')
          .in('user_id', userIds),
        supabaseClient
          .from('user_photos')
          .select('user_id, photo_url')
          .in('user_id', userIds)
          .eq('is_primary', true),
        supabaseClient.from('app_feed_likes').select('post_id, user_id').in('post_id', postIds),
        supabaseClient.from('app_feed_comments').select('post_id').in('post_id', postIds),
      ]);

      const nameMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
        nameMap[p.user_id] = p.first_name || p.full_name || 'Member';
      });
      const photoMap: Record<string, string> = {};
      (photosRes.data || []).forEach((p: any) => {
        photoMap[p.user_id] = p.photo_url;
      });
      const likeCounts: Record<number, number> = {};
      const likedByMe: Record<number, boolean> = {};
      (likesRes.data || []).forEach((l: any) => {
        likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
        if (l.user_id === user?.id) likedByMe[l.post_id] = true;
      });
      const commentCounts: Record<number, number> = {};
      (commentsRes.data || []).forEach((c: any) => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
      });

      return rows.map((r) => ({
        ...r,
        authorName: nameMap[r.user_id] || 'Member',
        authorPhoto: photoMap[r.user_id] || null,
        likeCount: likeCounts[r.id] || 0,
        likedByMe: !!likedByMe[r.id],
        commentCount: commentCounts[r.id] || 0,
      }));
    },
    [user?.id]
  );

  const loadPosts = useCallback(
    async (offset = 0) => {
      offset === 0 ? setLoading(true) : setLoadingMore(true);
      try {
        const { data, error } = await supabaseClient
          .from('app_feed_posts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const enriched = await enrich(data || []);
        setPosts((prev) => (offset === 0 ? enriched : [...prev, ...enriched]));
        setHasMore((data || []).length === PAGE_SIZE);
      } catch (e) {
        console.error('Feed load failed:', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [enrich]
  );

  useEffect(() => {
    void loadPosts(0);
  }, [loadPosts]);

  const toggleLike = async (post: FeedPost) => {
    if (!user?.id) return;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    try {
      if (post.likedByMe) {
        await supabaseClient
          .from('app_feed_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabaseClient.from('app_feed_likes').insert({ post_id: post.id, user_id: user.id });
      }
    } catch {
      void loadPosts(0); // resync on failure
    }
  };

  const openCommentsFor = async (postId: number) => {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    setCommentsLoading(true);
    try {
      const { data } = await supabaseClient
        .from('app_feed_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(50);
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length
        ? await supabaseClient
            .from('user_profiles')
            .select('user_id, first_name, full_name')
            .in('user_id', userIds)
        : { data: [] as any[] };
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.user_id] = p.first_name || p.full_name || 'Member';
      });
      setComments(
        (data || []).map((c: any) => ({ ...c, authorName: nameMap[c.user_id] || 'Member' }))
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async (postId: number) => {
    const body = commentBody.trim();
    if (!body || !user?.id) return;
    setCommentBody('');
    const { error } = await supabaseClient
      .from('app_feed_comments')
      .insert({ post_id: postId, user_id: user.id, body });
    if (!error) {
      setComments((prev) => [
        ...prev,
        {
          id: Date.now(),
          user_id: user.id,
          body,
          created_at: new Date().toISOString(),
          authorName: 'You',
        },
      ]);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
      );
    }
  };

  const reportPost = async (postId: number) => {
    if (!user?.id) return;
    await supabaseClient
      .from('app_feed_reports')
      .insert({ post_id: postId, reporter: user.id, reason: 'user_report' });
    alert('Thank you — this post has been reported to our moderation team.');
  };

  const deletePost = async (postId: number) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabaseClient.from('app_feed_posts').delete().eq('id', postId);
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 4 - files.length);
    const valid = selected.filter((f) => f.type.startsWith('image/') && f.size < 8 * 1024 * 1024);
    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submitPost = async () => {
    if (!user?.id || posting) return;
    if (!caption.trim() && files.length === 0) return;
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${
          file.name.split('.').pop() || 'jpg'
        }`;
        const { error: upErr } = await supabaseClient.storage
          .from('feed-media')
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabaseClient.storage.from('feed-media').getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      const { error } = await supabaseClient
        .from('app_feed_posts')
        .insert({ user_id: user.id, caption: caption.trim(), image_urls: urls });
      if (error) throw error;
      setCaption('');
      setFiles([]);
      setPreviews([]);
      await loadPosts(0);
    } catch (e) {
      console.error('Post failed:', e);
      alert('Could not publish your post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Layout title="Community" onBack={() => onNavigate('discovery')} showClose={false}>
      <div className="px-3 sm:px-4 py-4 pb-24 max-w-lg mx-auto space-y-4">
        {/* Composer */}
        {user && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share a moment with the community…"
              maxLength={2000}
              rows={2}
              className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
            />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full p-0.5"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-1.5 text-rose-500 text-sm font-medium cursor-pointer hover:text-rose-600">
                <Camera className="w-4 h-4" />
                Photos ({files.length}/4)
                <input type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} />
              </label>
              <Button
                onClick={submitPost}
                disabled={posting || (!caption.trim() && files.length === 0)}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 h-9 text-sm"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Be kind. Explicit content is prohibited and removed — see our community guidelines.
            </p>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-16 text-white/80">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white/95 rounded-2xl p-8 text-center">
            <Camera className="w-10 h-10 text-rose-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">The community feed starts with you</p>
            <p className="text-sm text-gray-500 mt-1">
              Share a photo or a moment — be the first post members see.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  {post.authorPhoto ? (
                    <img
                      src={post.authorPhoto}
                      alt={post.authorName}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-semibold text-sm">
                      {post.authorName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                      {post.authorName}
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                    </p>
                    <p className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {post.user_id === user?.id ? (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                      aria-label="Delete post"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => reportPost(post.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                      aria-label="Report post"
                      type="button"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Media */}
              {post.image_urls.length > 0 && (
                <div className="px-3">
                  <SnapGallery urls={post.image_urls} />
                </div>
              )}

              {/* Caption */}
              {post.caption && (
                <p className="px-4 pt-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {post.caption}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-5 px-4 py-3">
                <button
                  onClick={() => toggleLike(post)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    post.likedByMe ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
                  }`}
                  type="button"
                >
                  <Heart className={`w-5 h-5 ${post.likedByMe ? 'fill-current' : ''}`} />
                  {post.likeCount > 0 && post.likeCount}
                </button>
                <button
                  onClick={() => openCommentsFor(post.id)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                  type="button"
                >
                  <MessageCircle className="w-5 h-5" />
                  {post.commentCount > 0 && post.commentCount}
                </button>
              </div>

              {/* Comments */}
              {openComments === post.id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                  {commentsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                  ) : (
                    comments.map((c) => (
                      <p key={c.id} className="text-sm text-gray-700">
                        <span className="font-semibold">{c.authorName}</span> {c.body}
                      </p>
                    ))
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                      placeholder="Add a comment…"
                      maxLength={500}
                      className="flex-1 text-sm bg-gray-50 rounded-full px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-300"
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      className="text-rose-500 p-1.5"
                      aria-label="Send comment"
                      type="button"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}

        {/* Load more */}
        {!loading && hasMore && posts.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => loadPosts(posts.length)}
              disabled={loadingMore}
              className="bg-white/20 text-white hover:bg-white/30 rounded-full px-6"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};
