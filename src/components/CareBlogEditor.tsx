import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, Bold, Check, Copy, Eraser, Eye, EyeOff, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListOrdered,
  PenLine, Plus, Quote, RefreshCw, Save, Table as TableIcon, Underline, Upload, Youtube, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/lib/photoUpload';
import { moderateImage } from '@/lib/imageModeration';
import { CATEGORIES, articleShareUrl, readMinutes, type ArticleCategory } from '@/lib/blog';
import { htmlToText, imageHtml, sanitizeArticleHtml, tableHtml, textToHtml, youtubeEmbedHtml, youtubeId } from '@/lib/articleHtml';
import { ArticleBody } from '@/components/ArticleBody';

/**
 * Care Blog editor - the admin's own way to write and publish.
 *
 * Sits beside the scheduled publisher, not instead of it. A piece has a
 * title, category, author, one-line summary, a thumbnail (uploaded from the
 * phone or pasted as an address), and a body written in a rich editor:
 * headings, bold and italic, lists, quotes, links, tables, pictures and a
 * YouTube player. Everything is saved by save_blog_article(), which checks
 * is_admin on the server, derives the slug, and sends the "new article" push
 * the first time a piece is published.
 *
 * Pictures go to the blog-media bucket (admins only) and through the same
 * Vision screening as every other photo on the site before their address
 * is written into the article. The HTML is sanitised on the way in and on
 * the way out; the preview shows exactly what members will see.
 */

interface Row {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  content_html: string | null;
  audience: 'diaspora' | 'general' | null;
  category: ArticleCategory | null;
  author_name: string | null;
  cover_image: string | null;
  seo_title: string | null;
  seo_keywords: string | null;
  featured: boolean;
  trending: boolean;
  published: boolean;
  published_at: string | null;
  updated_at: string | null;
  sort_order: number | null;
}

interface Draft {
  id: string | null;
  title: string;
  excerpt: string;
  audience: '' | 'diaspora' | 'general';
  category: '' | ArticleCategory;
  author_name: string;
  cover_image: string;
  seo_title: string;
  seo_keywords: string;
  featured: boolean;
  trending: boolean;
}

const EMPTY: Draft = {
  id: null, title: '', excerpt: '', audience: '', category: '', author_name: 'Dates Care team',
  cover_image: '', seo_title: '', seo_keywords: '', featured: false, trending: false,
};

const ROW_COLUMNS =
  'id, title, slug, excerpt, content, content_html, audience, category, author_name, cover_image, seo_title, seo_keywords, featured, trending, published, published_at, updated_at, sort_order';

type Panel = null | 'link' | 'image' | 'video' | 'table';

const field = 'w-full rounded-xl bg-white text-gray-900 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-rose-400';
const label = 'block text-xs uppercase tracking-wide text-white/60 mb-1';

export const CareBlogEditor: React.FC<{ onSuccess?: (m: string) => void; onError?: (m: string) => void }> = ({ onSuccess, onError }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'unpublish' | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [textLen, setTextLen] = useState(0);
  const [words, setWords] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [panelValue, setPanelValue] = useState('');
  const [panelCaption, setPanelCaption] = useState('');
  const [tableSize, setTableSize] = useState({ rows: 3, cols: 3 });
  const [uploading, setUploading] = useState<'body' | 'cover' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const bodyFile = useRef<HTMLInputElement>(null);
  const coverFile = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from('blog_articles')
      .select(ROW_COLUMNS)
      .order('published', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });
    if (error) onError?.(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  const measure = () => {
    const el = editorRef.current;
    const text = el ? (el.innerText ?? '').trim() : '';
    setTextLen(text.length);
    setWords(text ? text.split(/\s+/).length : 0);
  };

  const setEditorHtml = (html: string) => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeArticleHtml(html);
    measure();
  };

  const startNew = () => {
    setDraft(EMPTY);
    setPreview(false);
    setPanel(null);
    setEditorHtml('');
  };

  const edit = (r: Row) => {
    setDraft({
      id: r.id, title: r.title, excerpt: r.excerpt ?? '', audience: r.audience ?? '', category: r.category ?? '',
      author_name: r.author_name ?? 'Dates Care team', cover_image: r.cover_image ?? '', seo_title: r.seo_title ?? '',
      seo_keywords: r.seo_keywords ?? '', featured: r.featured, trending: r.trending,
    });
    setPreview(false);
    setPanel(null);
    setEditorHtml(r.content_html && r.content_html.trim() ? r.content_html : textToHtml(r.content));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---- selection and commands -------------------------------------------
  const rememberSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) savedRange.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) {
      sel.addRange(savedRange.current);
    } else {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.addRange(r);
    }
  };

  const exec = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
    measure();
  };

  const insertHtml = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    rememberSelection();
    measure();
  };

  const openPanel = (p: Panel) => {
    rememberSelection();
    setPanelValue('');
    setPanelCaption('');
    setPanel(panel === p ? null : p);
  };

  const applyPanel = () => {
    const v = panelValue.trim();
    if (panel === 'link') {
      if (!/^https?:\/\//i.test(v)) { onError?.('A link must start with http:// or https://'); return; }
      restoreSelection();
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        document.execCommand('insertHTML', false, `<a href="${v.replace(/"/g, '&quot;')}">${v.replace(/</g, '&lt;')}</a>`);
      } else {
        document.execCommand('createLink', false, v);
      }
      rememberSelection();
    } else if (panel === 'image') {
      if (!/^https:\/\//i.test(v)) { onError?.('A picture address must start with https://'); return; }
      insertHtml(imageHtml(v, panelCaption));
    } else if (panel === 'video') {
      const id = youtubeId(v);
      if (!id) { onError?.('That does not look like a YouTube link'); return; }
      insertHtml(youtubeEmbedHtml(id));
    } else if (panel === 'table') {
      insertHtml(tableHtml(tableSize.rows, tableSize.cols));
    }
    setPanel(null);
    measure();
  };

  // ---- pictures ------------------------------------------------------------
  const uploadPicture = async (file: File): Promise<string | null> => {
    if (!user?.id) { onError?.('Please sign in again.'); return null; }
    const store = supabaseClient.storage.from('blog-media');
    const path = `articles/${crypto.randomUUID()}.jpg`;
    try {
      const blob = await compressImage(file);
      const { error } = await store.upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) { onError?.(`Could not upload: ${error.message}`); return null; }
      const url = store.getPublicUrl(path).data.publicUrl;
      const verdict = await moderateImage(url, user.id, 'photo');
      if (!verdict.allowed) {
        await store.remove([path]);
        onError?.(verdict.reason ?? 'That picture does not meet the content rules.');
        return null;
      }
      return url;
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not upload that picture.');
      return null;
    }
  };

  const onBodyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading('body');
    const url = await uploadPicture(file);
    setUploading(null);
    if (url) insertHtml(imageHtml(url, ''));
  };

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading('cover');
    const url = await uploadPicture(file);
    setUploading(null);
    if (url) setDraft((d) => ({ ...d, cover_image: url }));
  };

  // ---- save ------------------------------------------------------------------
  const save = async (publish: boolean | null) => {
    const html = sanitizeArticleHtml(editorRef.current?.innerHTML ?? '');
    const text = htmlToText(html);
    const mode = publish === true ? 'publish' : publish === false ? 'unpublish' : 'draft';
    setSaving(mode);
    const { data, error } = await supabaseClient.rpc('save_blog_article', {
      p_id: draft.id,
      p_title: draft.title,
      p_excerpt: draft.excerpt,
      p_content: text,
      p_audience: draft.audience,
      p_publish: publish,
      p_extra: {
        content_html: html,
        category: draft.category,
        author_name: draft.author_name,
        cover_image: draft.cover_image,
        seo_title: draft.seo_title,
        seo_keywords: draft.seo_keywords,
        featured: draft.featured,
        trending: draft.trending,
      },
    });
    setSaving(null);
    if (error) { onError?.(error.message); return; }
    const res = data as { id: string; published: boolean; title: string };
    setDraft((d) => ({ ...d, id: res.id }));
    onSuccess?.(res.published ? `Published: ${res.title}` : `Saved: ${res.title}`);
    await load();
  };

  const togglePreview = () => {
    if (!preview) setPreviewHtml(sanitizeArticleHtml(editorRef.current?.innerHTML ?? ''));
    setPreview(!preview);
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(articleShareUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      onError?.('Could not copy. The link is ' + articleShareUrl(slug));
    }
  };

  const current = draft.id ? rows.find((r) => r.id === draft.id) : undefined;
  const canSave = draft.title.trim().length >= 4 && textLen >= 200 && !saving && !uploading;
  const shown = rows.filter((r) => filter === 'all' || (filter === 'published' ? r.published : !r.published));

  const tool = (title: string, onClick: () => void, icon: React.ReactNode, active = false) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-2 rounded-lg ${active ? 'bg-rose-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Editor */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg inline-flex items-center gap-2">
            <PenLine className="w-5 h-5" /> {draft.id ? 'Edit article' : 'Create article'}
          </h3>
          {draft.id && (
            <button type="button" onClick={startNew} className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>

        <label className={label}>Title</label>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={140} placeholder="A clear, honest title" className={`${field} mb-4`} />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={label}>Category</label>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft['category'] })} className={field}>
              <option value="">Choose a category</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Author</label>
            <input value={draft.author_name} onChange={(e) => setDraft({ ...draft, author_name: e.target.value })} maxLength={80} placeholder="Dates Care team" className={field} />
          </div>
          <div>
            <label className={label}>Written for</label>
            <select value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value as Draft['audience'] })} className={field}>
              <option value="">Everyone</option>
              <option value="diaspora">Members living abroad (shows a "Living abroad" tag)</option>
              <option value="general">Canadian singles generally</option>
            </select>
          </div>
          <div>
            <label className={label}>Excerpt (one or two lines)</label>
            <input value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} maxLength={300} placeholder="Shown under the title in lists and in the share preview" className={field} />
          </div>
        </div>

        {/* Thumbnail */}
        <label className={label}>Thumbnail</label>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {draft.cover_image ? (
            <div className="relative w-full sm:w-48 shrink-0">
              <img src={draft.cover_image} alt="" className="w-full h-32 object-cover rounded-xl bg-black/20" />
              <button type="button" onClick={() => setDraft({ ...draft, cover_image: '' })} aria-label="Remove thumbnail" className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => coverFile.current?.click()} disabled={!!uploading} className="w-full sm:w-48 h-32 shrink-0 rounded-xl border-2 border-dashed border-white/40 text-white/80 hover:bg-white/10 inline-flex flex-col items-center justify-center gap-1 text-sm">
              <Upload className="w-5 h-5" /> {uploading === 'cover' ? 'Checking…' : 'Upload a picture'}
            </button>
          )}
          <input ref={coverFile} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
          <div className="flex-1">
            <input value={draft.cover_image} onChange={(e) => setDraft({ ...draft, cover_image: e.target.value })} placeholder="…or paste a picture address (https://)" className={field} />
            <p className="text-xs text-white/50 mt-1">Shown on the blog page, the homepage, and in the WhatsApp or Facebook preview when the link is shared. Use pictures you have the right to use.</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex items-center justify-between mb-1">
          <label className={label}>Article</label>
          <button type="button" onClick={togglePreview} className="text-xs text-white/80 hover:text-white inline-flex items-center gap-1">
            {preview ? <><PenLine className="w-3.5 h-3.5" /> Back to editing</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
          </button>
        </div>

        <div className="rounded-xl bg-white overflow-hidden">
          {!preview && (
            <div className="border-b border-gray-200 px-2 py-1.5 flex flex-wrap items-center gap-0.5 sticky top-0 bg-white z-10">
              {tool('Bold', () => exec('bold'), <Bold className="w-4 h-4" />)}
              {tool('Italic', () => exec('italic'), <Italic className="w-4 h-4" />)}
              {tool('Underline', () => exec('underline'), <Underline className="w-4 h-4" />)}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {tool('Heading', () => exec('formatBlock', '<h2>'), <Heading2 className="w-4 h-4" />)}
              {tool('Sub-heading', () => exec('formatBlock', '<h3>'), <Heading3 className="w-4 h-4" />)}
              {tool('Paragraph', () => exec('formatBlock', '<p>'), <span className="text-xs font-semibold px-0.5">¶</span>)}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {tool('Bulleted list', () => exec('insertUnorderedList'), <List className="w-4 h-4" />)}
              {tool('Numbered list', () => exec('insertOrderedList'), <ListOrdered className="w-4 h-4" />)}
              {tool('Quote', () => exec('formatBlock', '<blockquote>'), <Quote className="w-4 h-4" />)}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {tool('Link', () => openPanel('link'), <Link2 className="w-4 h-4" />, panel === 'link')}
              {tool('Table', () => openPanel('table'), <TableIcon className="w-4 h-4" />, panel === 'table')}
              {tool('Upload a picture', () => { rememberSelection(); bodyFile.current?.click(); }, <Upload className="w-4 h-4" />)}
              {tool('Picture by address', () => openPanel('image'), <ImageIcon className="w-4 h-4" />, panel === 'image')}
              {tool('YouTube video', () => openPanel('video'), <Youtube className="w-4 h-4" />, panel === 'video')}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              {tool('Clear formatting', () => exec('removeFormat'), <Eraser className="w-4 h-4" />)}
              {uploading === 'body' && <span className="text-xs text-gray-500 ml-2">Checking the picture…</span>}
            </div>
          )}
          <input ref={bodyFile} type="file" accept="image/*" onChange={onBodyFile} className="hidden" />

          {panel && !preview && (
            <div className="border-b border-gray-200 bg-rose-50 px-3 py-2 text-gray-900 text-sm">
              {panel === 'table' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Rows</span>
                  <input type="number" min={2} max={12} value={tableSize.rows} onChange={(e) => setTableSize({ ...tableSize, rows: Number(e.target.value) || 2 })} className="w-16 rounded-lg border border-gray-300 px-2 py-1" />
                  <span>Columns</span>
                  <input type="number" min={1} max={4} value={tableSize.cols} onChange={(e) => setTableSize({ ...tableSize, cols: Number(e.target.value) || 1 })} className="w-16 rounded-lg border border-gray-300 px-2 py-1" />
                  <span className="text-xs text-gray-500">Three columns or fewer read best on a phone.</span>
                  <button type="button" onClick={applyPanel} className="ml-auto px-3 py-1 rounded-lg bg-rose-600 text-white">Insert table</button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={panelValue}
                    onChange={(e) => setPanelValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPanel(); } }}
                    placeholder={panel === 'link' ? 'https://…' : panel === 'image' ? 'https://… picture address' : 'YouTube link'}
                    className="flex-1 min-w-[12rem] rounded-lg border border-gray-300 px-3 py-1.5"
                    autoFocus
                  />
                  {panel === 'image' && (
                    <input value={panelCaption} onChange={(e) => setPanelCaption(e.target.value)} placeholder="Caption (optional)" className="flex-1 min-w-[10rem] rounded-lg border border-gray-300 px-3 py-1.5" />
                  )}
                  <button type="button" onClick={applyPanel} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white">
                    {panel === 'link' ? 'Add link' : panel === 'image' ? 'Insert picture' : 'Embed video'}
                  </button>
                  <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="p-1 text-gray-500"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          )}

          {preview ? (
            <div className="p-5 sm:p-8">
              {draft.cover_image && <img src={draft.cover_image} alt="" className="w-full rounded-2xl mb-5 object-cover max-h-72" />}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{draft.title || 'Untitled'}</h1>
              <p className="text-gray-500 text-sm mb-6">{draft.author_name || 'Dates Care team'} · {readMinutes(htmlToText(previewHtml) || ' ')} min read</p>
              <ArticleBody html={previewHtml} text="" />
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write here. Select words to make them bold, a heading, or a link; use the buttons for tables, pictures and video."
              className="dc-article p-4 sm:p-6"
              onInput={measure}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              onBlur={rememberSelection}
            />
          )}
        </div>
        <p className="text-xs text-white/60 mt-1">
          {words} words · about {Math.max(1, Math.round(words / 200))} min read
          {textLen > 0 && textLen < 200 && ' · needs at least 200 characters of text'}
        </p>

        {/* SEO and flags */}
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={label}>SEO title (optional)</label>
            <input value={draft.seo_title} onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })} maxLength={120} placeholder="Defaults to the title" className={field} />
          </div>
          <div>
            <label className={label}>Keywords (optional, comma-separated)</label>
            <input value={draft.seo_keywords} onChange={(e) => setDraft({ ...draft, seo_keywords: e.target.value })} maxLength={300} placeholder="dating in Toronto, long-distance, first date" className={field} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 mt-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} className="w-4 h-4 accent-rose-600" />
            Featured (the large card at the top of the blog)
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.trending} onChange={(e) => setDraft({ ...draft, trending: e.target.checked })} className="w-4 h-4 accent-rose-600" />
            Trending (the row under it)
          </label>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Button type="button" onClick={() => save(null)} disabled={!canSave} className="bg-white/20 hover:bg-white/30 text-white">
            <Save className="w-4 h-4 mr-2" /> {saving === 'draft' ? 'Saving…' : current?.published ? 'Save changes' : 'Save as draft'}
          </Button>
          {!current?.published && (
            <Button type="button" onClick={() => save(true)} disabled={!canSave} className="bg-rose-500 hover:bg-rose-600 text-white">
              <Eye className="w-4 h-4 mr-2" /> {saving === 'publish' ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {current?.published && (
            <Button type="button" onClick={() => save(false)} disabled={!canSave} className="bg-white/10 hover:bg-white/20 text-white">
              <EyeOff className="w-4 h-4 mr-2" /> {saving === 'unpublish' ? 'Taking down…' : 'Take down'}
            </Button>
          )}
        </div>
        {current?.published && current.slug && (
          <p className="text-xs text-white/70 mt-3 inline-flex items-center gap-2">
            Share link: <span className="font-mono">{articleShareUrl(current.slug)}</span>
            <button type="button" onClick={() => copyLink(current.slug!)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20">
              {copied === current.slug ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </p>
        )}
        <p className="text-xs text-white/50 mt-3">
          Publishing puts the piece on the Care Blog and the homepage at once, and sends one notification to members who allow them
          (only the first time a piece is published). The scheduled Monday and Thursday articles carry on regardless.
          Say only what the site actually does; members and reviewers read these.
        </p>
      </div>

      {/* List */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg inline-flex items-center gap-2"><BookOpen className="w-5 h-5" /> Articles</h3>
          <div className="flex items-center gap-2 text-sm">
            {(['all', 'published', 'drafts'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg ${filter === f ? 'bg-white text-gray-900' : 'text-white/70 hover:bg-white/10'}`}>
                {f === 'all' ? 'All' : f === 'published' ? 'Published' : 'Drafts & queue'}
              </button>
            ))}
            <button type="button" onClick={() => load()} aria-label="Refresh" className="p-1 text-white/70 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {shown.length === 0 && !loading && <p className="text-white/60 text-sm">Nothing here yet.</p>}
        <ul className="divide-y divide-white/10">
          {shown.map((r) => (
            <li key={r.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {r.cover_image ? (
                  <img src={r.cover_image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-black/20" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/10 shrink-0 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-white/40" /></div>
                )}
                <div className="min-w-0">
                  <p className="font-medium leading-snug truncate">{r.title}</p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {r.published
                      ? `Published ${r.published_at ? new Date(r.published_at).toLocaleDateString() : ''}`
                      : r.sort_order != null ? `In the scheduled queue (#${r.sort_order})` : 'Draft'}
                    {r.category && ` · ${CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}`}
                    {r.featured && ' · Featured'}
                    {r.trending && ' · Trending'}
                    {' · '}{readMinutes(r.content)} min
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {r.published && r.slug && (
                  <button type="button" onClick={() => copyLink(r.slug!)} title="Copy share link" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                    {copied === r.slug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                <button type="button" onClick={() => edit(r)} className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Edit</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
