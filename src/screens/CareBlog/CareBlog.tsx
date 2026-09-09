import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { BookOpen, Clock, Search, ArrowLeft } from 'lucide-react';
import { fetchPublishedArticles, readMinutes, takeRequestedArticle, type BlogArticle } from '@/lib/blog';

/**
 * The Care Blog reads from blog_articles - the table that has existed since
 * the schema was written and that this screen never once queried.
 *
 * What was here before: nine hard-coded articles whose bodies were a single
 * sentence ending in "...", each with invented engagement figures (189 likes,
 * 34 comments, 1,256 views) summed into a "Total Likes" tile; a publishedAt
 * computed from Date.now() so every article was permanently "3h ago"; a
 * "Write" tab whose Publish button showed "Blog post published successfully!"
 * and wrote nothing; a "Load More Articles" button that loaded nothing; and a
 * Filter button with no handler.
 *
 * Now: real rows or an honest empty state. Writing is not a member feature.
 */

interface CareBlogProps {
  onNavigate: (screen: string) => void;
}

export const CareBlog: React.FC<CareBlogProps> = ({ onNavigate }) => {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState<BlogArticle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPublishedArticles();
        if (cancelled) return;
        setArticles(list);
        // Arrived for one article in particular - from the homepage, the
        // card in Discovery, or a push notification's link.
        const wanted = takeRequestedArticle();
        if (wanted) {
          const hit = list.find(a => a.slug === wanted);
          if (hit) setOpen(hit);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const q = searchTerm.trim().toLowerCase();
  const visible = q
    ? articles.filter(a => a.title.toLowerCase().includes(q) || (a.excerpt ?? '').toLowerCase().includes(q))
    : articles;

  if (open) {
    return (
      <Layout title="Care Blog" onBack={() => setOpen(null)} showClose={false}>
        <article className="px-4 py-6">
          <button type="button" onClick={() => setOpen(null)} className="text-white/80 text-sm mb-4 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> All articles
          </button>
          {open.cover_image && (
            <img src={open.cover_image} alt="" className="w-full rounded-2xl mb-5 object-cover max-h-72" />
          )}
          <h1 className="text-2xl font-bold text-white mb-2">{open.title}</h1>
          <p className="text-white/70 text-sm mb-6 inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {readMinutes(open.content)} min read
            {open.published_at && <> · {new Date(open.published_at).toLocaleDateString()}</>}
          </p>
          <div className="bg-white rounded-2xl p-5 sm:p-8 text-gray-800 leading-relaxed whitespace-pre-wrap">
            {open.content}
          </div>
        </article>
      </Layout>
    );
  }

  return (
    <Layout title="Care Blog" onBack={() => onNavigate('discovery')} showClose={false}>
      <div className="px-4 py-6 space-y-6">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-white/90 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">Care Blog</h1>
          <p className="text-white/80 text-sm">Practical writing on dating, relationships and looking after yourself.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search articles…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/90"
          />
        </div>

        {loading ? (
          <p className="text-white/70 text-center py-10">Loading…</p>
        ) : failed ? (
          <p className="text-white/80 text-center py-10">The blog could not be loaded right now. Please try again later.</p>
        ) : visible.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-white font-medium mb-1">{q ? 'Nothing matches that search.' : 'No articles yet.'}</p>
            {!q && (
              <p className="text-white/70 text-sm">
                We are writing the first ones. When they are published, they will appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpen(a)}
                className="w-full text-left bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg transition-shadow"
              >
                {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-40 object-cover" />}
                <div className="p-4">
                  {a.audience === 'diaspora' && (
                    <span className="inline-block text-[10px] uppercase tracking-wide text-rose-600 bg-rose-50 rounded px-1.5 py-0.5 mb-1.5">Living abroad</span>
                  )}
                  <h2 className="font-semibold text-gray-900 mb-1">{a.title}</h2>
                  {a.excerpt && <p className="text-gray-600 text-sm mb-2">{a.excerpt}</p>}
                  <p className="text-gray-500 text-xs inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {readMinutes(a.content)} min read
                    {a.published_at && <> · {new Date(a.published_at).toLocaleDateString()}</>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
