import { supabaseClient } from './supabase';

/**
 * Care Blog - the reading side.
 *
 * Articles come from blog_articles, published one at a time by a scheduled
 * job on the server (see migration 20260909000001). Nothing here writes.
 */

export type ArticleCategory = 'dating' | 'canada' | 'safety' | 'community' | 'news';

export const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'dating', label: 'Dating & Relationships' },
  { value: 'canada', label: 'Life in Canada' },
  { value: 'safety', label: 'Safety & Trust' },
  { value: 'community', label: 'Community' },
  { value: 'news', label: 'Dates Care News' },
];

export function categoryLabel(c: string | null | undefined): string | null {
  return CATEGORIES.find((x) => x.value === c)?.label ?? null;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  /** Rich body written in the editor; null for the plain-text library pieces. */
  content_html: string | null;
  cover_image: string | null;
  audience: 'diaspora' | 'general' | null;
  category: ArticleCategory | null;
  author_name: string | null;
  featured: boolean;
  trending: boolean;
  published_at: string | null;
  created_at: string;
}

export const ARTICLE_COLUMNS =
  'id, title, slug, excerpt, content, content_html, cover_image, audience, category, author_name, featured, trending, published_at, created_at';

/** The public, shareable address of one article - the one that shows a card in WhatsApp. */
export function articleShareUrl(slug: string): string {
  return `https://dates.care/a/${encodeURIComponent(slug)}`;
}

export async function fetchPublishedArticles(limit?: number): Promise<BlogArticle[]> {
  let q = supabaseClient
    .from('blog_articles')
    .select(ARTICLE_COLUMNS)
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BlogArticle[];
}

export function readMinutes(text: string): number {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

/**
 * Deep link to one article: `#care-blog?a=<slug>`. Used by the homepage
 * teaser, the in-app card, and the push notification, so all three land on
 * the same screen the same way.
 */
export function articleHash(slug: string): string {
  return `#care-blog?a=${encodeURIComponent(slug)}`;
}

export function articleSlugFromHash(hash: string = typeof window !== 'undefined' ? window.location.hash : ''): string | null {
  const q = hash.split('?')[1];
  if (!q) return null;
  const slug = new URLSearchParams(q).get('a');
  return slug ? slug.trim() : null;
}

/**
 * Hand-off for in-app navigation. handleNavigate() rewrites the URL to a
 * bare `#care-blog`, so the slug travels here instead; the hash form above
 * is for arrivals from outside (a push notification, a shared link).
 */
let pendingArticle: string | null = null;

export function openArticle(slug: string, onNavigate: (screen: string) => void): void {
  pendingArticle = slug;
  onNavigate('care-blog');
}

/** Read-once: the slug an in-app tap asked for, or the one in the URL. */
export function takeRequestedArticle(): string | null {
  const slug = pendingArticle ?? articleSlugFromHash();
  pendingArticle = null;
  return slug;
}
