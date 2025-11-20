import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Trash2, CreditCard as Edit2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { communityFeatures, UserComment } from '@/lib/communityFeatures';
import { cn } from '@/lib/utils';

interface CommentSectionProps {
  contentType: string;
  contentId: string;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  contentType,
  contentId,
  className = ''
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<UserComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComments();
    if (user) {
      loadLikedStatus();
    }
  }, [contentType, contentId, user]);

  const loadComments = async () => {
    setLoading(true);
    const { comments: fetchedComments } = await communityFeatures.getComments(
      contentType,
      contentId
    );
    setComments(fetchedComments);
    setLoading(false);
  };

  const loadLikedStatus = async () => {
    if (!user) return;

    const likedSet = new Set<string>();
    for (const comment of comments) {
      const hasLiked = await communityFeatures.hasLikedComment(user.id, comment.id);
      if (hasLiked) {
        likedSet.add(comment.id);
      }
    }
    setLikedComments(likedSet);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);

    const { success, comment } = await communityFeatures.addComment(
      user.id,
      contentType,
      contentId,
      newComment.trim()
    );

    if (success && comment) {
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    }

    setSubmitting(false);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      alert('Please sign in to like comments');
      return;
    }

    const isLiked = likedComments.has(commentId);

    if (isLiked) {
      const { success } = await communityFeatures.unlikeComment(user.id, commentId);
      if (success) {
        setLikedComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, likes_count: Math.max(0, c.likes_count - 1) }
              : c
          )
        );
      }
    } else {
      const { success } = await communityFeatures.likeComment(user.id, commentId);
      if (success) {
        setLikedComments(prev => new Set(prev).add(commentId));
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, likes_count: c.likes_count + 1 }
              : c
          )
        );
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getUserInitials = (email?: string) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className={cn("bg-white rounded-2xl p-6 shadow-lg", className)}>
        <div className="text-center text-gray-500">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl p-6 shadow-lg", className)}>
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-pink-500" />
        <h3 className="text-lg font-bold text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>

      {user && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                disabled={submitting}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 resize-none transition-colors"
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!user && (
        <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-xl text-center">
          <p className="text-pink-800 text-sm">
            Sign in to join the conversation and share your thoughts
          </p>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No comments yet. Be the first to share!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {getUserInitials(comment.user?.email)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {comment.user?.email?.split('@')[0] || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                  {comment.is_edited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>

                <p className="text-gray-700 text-sm mb-2 leading-relaxed">
                  {comment.comment_text}
                </p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    disabled={!user}
                    className={cn(
                      "flex items-center gap-1 text-xs transition-colors",
                      likedComments.has(comment.id)
                        ? "text-pink-500"
                        : "text-gray-500 hover:text-pink-500"
                    )}
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4",
                        likedComments.has(comment.id) && "fill-current"
                      )}
                    />
                    <span className="font-medium">{comment.likes_count}</span>
                  </button>

                  {user && user.id === comment.user_id && (
                    <button className="text-xs text-gray-500 hover:text-pink-500 transition-colors flex items-center gap-1">
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
