import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, X } from 'lucide-react';
import { categoryLabel, fetchPublishedArticles, openArticle, readMinutes, type BlogArticle } from '@/lib/blog';

/**
 * The Care Blog, surfaced where people already are.
 *
 * Two shapes. `variant="home"` is the public homepage strip: the latest three
 * pieces, for visitors and for search engines. `variant="card"` is the quiet
 * card inside Discovery: the newest piece only, dismissible, and it stays
 * dismissed until there is a newer one. Neither renders anything while the
 * library is empty - an empty "From the blog" box is worse than none.
 */
interface BlogTeaserProps {
  variant: 'home' | 'card';
  onNavigate: (screen: string) => void;
}

const DISMISS_KEY = 'dc_blog_card_dismissed';

export const BlogTeaser: React.FC<BlogTeaserProps> = ({ variant, onNavigate }) => {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
  });

  useEffect(() => {
    let cancelled = false;
    fetchPublishedArticles(variant === 'home' ? 3 : 1)
      .then((list) => { if (!cancelled) setArticles(list); })
      .catch(() => { /* the strip simply does not appear */ });
    return () => { cancelled = true; };
  }, [variant]);

  if (articles.length === 0) return null;

  if (variant === 'card') {
    const a = articles[0];
    if (!a.slug || dismissed === a.id) return null;
    const dismiss = () => {
      setDismissed(a.id);
      try { localStorage.setItem(DISMISS_KEY, a.id); } catch { /* ignore */ }
    };
    return (
      <div className="mx-4 mt-3 mb-1 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[11px] uppercase tracking-wide text-white/60 mb-1 inline-flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" /> From the Care Blog
        </p>
        <button
          type="button"
          onClick={() => openArticle(a.slug!, onNavigate)}
          className="flex gap-3 text-left w-full pr-6"
        >
          {a.cover_image && <img src={a.cover_image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 bg-black/20" />}
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{a.title}</p>
            {a.excerpt && <p className="text-white/75 text-sm mt-1 line-clamp-2">{a.excerpt}</p>}
            <p className="text-white/50 text-xs mt-2 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {readMinutes(a.content)} min read
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold mb-1">Care Blog</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Practical writing on dating well
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('care-blog')}
          className="text-sm font-semibold text-rose-600 hover:text-rose-700 whitespace-nowrap"
        >
          All articles
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {articles.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => a.slug && openArticle(a.slug, onNavigate)}
            className="text-left rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
          >
            {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-40 object-cover bg-gray-100" loading="lazy" />}
            <div className="p-5">
              {(categoryLabel(a.category) || a.audience === 'diaspora') && (
                <span className="inline-block text-[10px] uppercase tracking-wide text-rose-600 bg-rose-50 rounded px-1.5 py-0.5 mb-2">
                  {categoryLabel(a.category) ?? 'Living abroad'}
                </span>
              )}
              <h3 className="font-semibold text-gray-900 leading-snug mb-2">{a.title}</h3>
              {a.excerpt && <p className="text-gray-600 text-sm line-clamp-3">{a.excerpt}</p>}
              <p className="text-gray-400 text-xs mt-3 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {readMinutes(a.content)} min read
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
