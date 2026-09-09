import { supabaseClient } from './supabase';

/**
 * Auto-draft and free stock pictures for the Care Blog editor.
 *
 * Both keys - Gemini's and Pexels' - live in Supabase Edge Function secrets
 * and are read only by the functions. Nothing here holds a key, and the
 * browser never sees one. Both functions refuse anyone who is not an admin,
 * checked on the server rather than by hiding a button.
 */

export interface DraftRequest {
  topic: string;
  category: string;
  audience: string;
  length: 'short' | 'medium' | 'long';
  extra?: string;
}

export interface GeneratedDraft {
  title: string;
  excerpt: string;
  html: string;
  seo_title: string;
  seo_keywords: string;
  /** Photo search phrases the model suggests, fed straight into the Pexels box. */
  image_queries: string[];
  /** What the model deliberately left for a person: facts about the site,
   *  anything it could not check. Shown to the editor, never published. */
  notes: string[];
}

export interface DraftResult {
  draft: GeneratedDraft;
  model: string;
  words: number;
}

export interface PexelsPhoto {
  id: number;
  thumb: string;
  full: string;
  alt: string;
  avg_color: string | null;
  photographer: string;
  photographer_url: string;
  page_url: string;
}

export interface ImportedPhoto {
  url: string;
  credit: string;
  credit_url: string;
  path: string;
}

/**
 * supabase.functions.invoke hides the body of a failed call behind
 * error.context, so a 429 or a missing key arrives as "Edge Function
 * returned a non-2xx status code" and nothing else. This digs the real
 * message out so the editor is told what actually happened.
 */
async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseClient.functions.invoke(name, { body });
  if (!error) return data as T;

  let message = error.message || 'That did not work.';
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.clone().json();
      if (parsed?.message) message = String(parsed.message);
      else if (parsed?.error) message = String(parsed.error);
      if (parsed?.hint) message += ` ${String(parsed.hint)}`;
    }
  } catch {
    /* keep the generic message */
  }
  throw new Error(message);
}

export async function generateArticleDraft(req: DraftRequest): Promise<DraftResult> {
  const data = await invoke<{ draft: GeneratedDraft; model: string; words: number }>('blog-draft', {
    topic: req.topic,
    category: req.category,
    audience: req.audience,
    length: req.length,
    extra: req.extra ?? '',
  });
  if (!data?.draft?.html) throw new Error('The draft came back empty. Please try again.');
  return { draft: data.draft, model: data.model, words: data.words };
}

export async function searchPexels(query: string, page = 1, orientation: 'landscape' | 'portrait' | 'square' = 'landscape'): Promise<PexelsPhoto[]> {
  const data = await invoke<{ photos: PexelsPhoto[] }>('pexels', { action: 'search', query, page, orientation });
  return data?.photos ?? [];
}

export async function importPexelsPhoto(photo: PexelsPhoto): Promise<ImportedPhoto> {
  const data = await invoke<ImportedPhoto>('pexels', {
    action: 'import',
    url: photo.full,
    photographer: photo.photographer,
    photographer_url: photo.photographer_url,
  });
  if (!data?.url) throw new Error('The picture could not be saved.');
  return data;
}

/** A caption that credits the photographer, as the Pexels licence asks. */
export function creditCaption(caption: string, credit: string, creditUrl: string): string {
  const words = caption.trim();
  const link = `<a href="${creditUrl.replace(/"/g, '&quot;')}">${credit.replace(/</g, '&lt;')}</a>`;
  return words ? `${words} · ${link}` : link;
}
