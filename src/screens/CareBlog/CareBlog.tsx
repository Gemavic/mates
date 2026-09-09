import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { BookOpen, Clock, Search, ArrowLeft, Share2, Check, Flame, Star } from 'lucide-react';
import {
  CATEGORIES, articleShareUrl, categoryLabel, fetchPublishedArticles, readMinutes, takeRequestedArticle,
  type ArticleCategory, type BlogArticle,
} from '@/lib/blog';
import { ArticleBody } from '@/components/ArticleBody';

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
 * Now: real rows or an honest empty state. A featured piece at the top, a
 * trending row, category chips, thumbnails, and a body that can carry
 * headings, tables, pictures and a video (ArticleBody). Writing is for the
 * Staff panel, not members.
 */

interface CareBlogProps {
  onNavigate: (screen: string) => void;
}

const Meta: React.FC<{ a: BlogArticle; light?: boolean }> = ({ a, light }) => (
  <p className={`${light ? 'text-white/70' : 'text-gray-500'} text-xs inline-flex items-center gap-1 flex-wrap`}>
    {a.author_name && <>{a.author_name} · </>}
    <Clock className="w-3.5 h-3.5" /> {readMinutes(a.content)} min read
    {a.published_at && <> · {new Date(a.published_at).toLocaleDateString()}</>}
  </p>
);

const Tag: React.FC<{ a: BlogArticle }> = ({ a }) => {
  const c = categoryLabel(a.category);
  if (!c && a.audience !== 'diaspora') return null;
  return (
    <span className="inline-flex flex-wrap gap-1 mb-1.5">
      {c && <span className="text-[10px] uppercase tracking-wide text-rose-600 bg-rose-50 rounded px-1.5 py-0.5">{c}</span>}
      {a.audience === 'diaspora' && <span className="text-[10px] uppercase tracking-wide text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">Living abroad</span>}
    </span>
  );
};

export const CareBlog: React.FC<CareBlogProps> = ({ onNavigate }) => {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'' | ArticleCategory>('');
  const [open, setOpen] = useState<BlogArticle | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPublishedArticles();
        if (cancelled) return;
        setArticles(list);
        // Arrived for one article in particular - from the homepage, the
        // card in Discovery, a push notification, or a shared /a/ link.
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

  useEffect(() => { window.scrollTo({ top: 0 }); setShared(false); }, [open?.id]);

  const share = async (a: BlogArticle) => {
    if (!a.slug) return;
    const url = articleShareUrl(a.slug);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: a.title, text: a.excerpt ?? undefined, url });
        return;
      }
    } catch {
      /* fall through to copying */
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* nothing else to do on this device */
    }
  };

  const q = searchTerm.trim().toLowerCase();
  const filtered = articles.filter(a =>
    (!category || a.category === category) &&
    (!q || a.title.toLowerCase().includes(q) || (a.excerpt ?? '').toLowerCase().includes(q) || a.content.toLowerCase().includes(q))
  );
  const browsing = !!q || !!category;
  const featured = browsing ? null : filtered.find(a => a.featured && a.cover_image) ?? filtered.find(a => a.featured) ?? null;
  const trending = browsing ? [] : filtered.filter(a => a.trending && a.id !== featured?.id).slice(0, 6);
  const rest = filtered.filter(a => a.id !== featured?.id);
  const usedCategories = new Set(articles.map(a => a.category).filter(Boolean));

  if (open) {
    const more = articles.filter(a => a.id !== open.id && (open.category ? a.category === open.category : true)).slice(0, 3);
    return (
      <Layout title="Care Blog" onBack={() => setOpen(null)} showClose={false}>
        <article className="px-4 py-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setOpen(null)} className="text-white/80 text-sm inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> All articles
            </button>
            {open.slug && (
              <button type="button" onClick={() => share(open)} className="text-white/80 text-sm inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                {shared ? <><Check className="w-4 h-4" /> Link copied</> : <><Share2 className="w-4 h-4" /> Share</>}
              </button>
            )}
          </div>
          {open.cover_image && (
            <figure className="mb-5">
              <img src={open.cover_image} alt="" className="w-full rounded-2xl object-cover max-h-80 bg-black/20" />
              {open.cover_credit && (
                <figcaption className="text-white/50 text-xs mt-1.5 text-right">
                  {open.cover_credit_url
                    ? <a href={open.cover_credit_url} target="_blank" rel="noopener noreferrer" className="underline">{open.cover_credit}</a>
                    : open.cover_credit}
                </figcaption>
              )}
            </figure>
          )}
          {(categoryLabel(open.category) || open.audience === 'diaspora') && (
            <p className="text-[11px] uppercase tracking-wide text-rose-200 mb-1">
              {categoryLabel(open.category)}{categoryLabel(open.category) && open.audience === 'diaspora' ? ' · ' : ''}{open.audience === 'diaspora' ? 'Living abroad' : ''}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{open.title}</h1>
          <div className="mb-6"><Meta a={open} light /></div>
          <div className="bg-white rounded-2xl p-5 sm:p-8">
            <ArticleBody html={open.content_html} text={open.content} />
          </div>
          {more.length > 0 && (
            <div className="mt-8">
              <p className="text-white/80 text-sm font-semibold mb-3">More to read</p>
              <div className="space-y-3">
                {more.map(a => (
                  <button key={a.id} type="button" onClick={() => setOpen(a)} className="w-full text-left bg-white/10 hover:bg-white/15 rounded-xl p-3 flex gap-3 items-center">
                    {a.cover_image && <img src={a.cover_image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 bg-black/20" />}
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-snug line-clamp-2">{a.title}</p>
                      <Meta a={a} light />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>
      </Layout>
    );
  }

  return (
    <Layout title="Care Blog" onBack={() => onNavigate('discovery')} showClose={false}>
      <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
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

        {usedCategories.size > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button type="button" onClick={() => setCategory('')} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${!category ? 'bg-white text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'}`}>All</button>
            {CATEGORIES.filter(c => usedCategories.has(c.value)).map(c => (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${category === c.value ? 'bg-white text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-white/70 text-center py-10">Loading…</p>
        ) : failed ? (
          <p className="text-white/80 text-center py-10">The blog could not be loaded right now. Please try again later.</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-white font-medium mb-1">{browsing ? 'Nothing matches.' : 'No articles yet.'}</p>
            {!browsing && (
              <p className="text-white/70 text-sm">
                We are writing the first ones. When they are published, they will appear here.
              </p>
            )}
          </div>
        ) : (
          <>
            {featured && (
              <button type="button" onClick={() => setOpen(featured)} className="w-full text-left bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg transition-shadow">
                {featured.cover_image && <img src={featured.cover_image} alt="" className="w-full h-52 sm:h-64 object-cover bg-gray-100" />}
                <div className="p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-wide text-amber-600 inline-flex items-center gap-1 mb-1.5"><Star className="w-3 h-3" /> Featured</p>
                  <Tag a={featured} />
                  <h2 className="text-xl font-bold text-gray-900 leading-snug mb-1">{featured.title}</h2>
                  {featured.excerpt && <p className="text-gray-600 text-sm mb-2">{featured.excerpt}</p>}
                  <Meta a={featured} />
                </div>
              </button>
            )}

            {trending.length > 0 && (
              <div>
                <p className="text-white/90 text-sm font-semibold inline-flex items-center gap-1 mb-2"><Flame className="w-4 h-4 text-orange-300" /> Trending</p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
                  {trending.map(a => (
                    <button key={a.id} type="button" onClick={() => setOpen(a)} className="snap-start shrink-0 w-56 text-left bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition-shadow">
                      {a.cover_image ? <img src={a.cover_image} alt="" className="w-full h-28 object-cover bg-gray-100" /> : <div className="w-full h-28 bg-rose-50" />}
                      <div className="p-3">
                        <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{a.title}</p>
                        <p className="text-gray-500 text-xs mt-1">{readMinutes(a.content)} min read</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {rest.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setOpen(a)}
                  className="w-full text-left bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg transition-shadow flex"
                >
                  {a.cover_image && <img src={a.cover_image} alt="" className="w-28 sm:w-40 self-stretch object-cover shrink-0 bg-gray-100" />}
                  <div className="p-4 min-w-0">
                    <Tag a={a} />
                    <h2 className="font-semibold text-gray-900 mb-1 leading-snug">{a.title}</h2>
                    {a.excerpt && <p className="text-gray-600 text-sm mb-2 line-clamp-2">{a.excerpt}</p>}
                    <Meta a={a} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
