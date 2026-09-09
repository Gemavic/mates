import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Eye, EyeOff, PenLine, Plus, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';
import { readMinutes } from '@/lib/blog';

/**
 * Care Blog editor - the admin's own way to write and publish.
 *
 * Sits beside the scheduled publisher, not instead of it. Anything written
 * here is saved by save_blog_article(), which checks is_admin on the server,
 * derives the slug, and sends the "new article" push the first time a piece
 * is published. Plain text: paragraphs separated by a blank line, which is
 * exactly how the Care Blog screen renders them.
 */

interface Row {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  audience: 'diaspora' | 'general' | null;
  published: boolean;
  published_at: string | null;
  updated_at: string | null;
  sort_order: number | null;
}

interface Draft {
  id: string | null;
  title: string;
  excerpt: string;
  content: string;
  audience: '' | 'diaspora' | 'general';
}

const EMPTY: Draft = { id: null, title: '', excerpt: '', content: '', audience: '' };

export const CareBlogEditor: React.FC<{ onSuccess?: (m: string) => void; onError?: (m: string) => void }> = ({ onSuccess, onError }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'unpublish' | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from('blog_articles')
      .select('id, title, slug, excerpt, content, audience, published, published_at, updated_at, sort_order')
      .order('published', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });
    if (error) onError?.(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  const edit = (r: Row) => {
    setDraft({ id: r.id, title: r.title, excerpt: r.excerpt ?? '', content: r.content, audience: r.audience ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (publish: boolean | null) => {
    const mode = publish === true ? 'publish' : publish === false ? 'unpublish' : 'draft';
    setSaving(mode);
    const { data, error } = await supabaseClient.rpc('save_blog_article', {
      p_id: draft.id,
      p_title: draft.title,
      p_excerpt: draft.excerpt,
      p_content: draft.content,
      p_audience: draft.audience,
      p_publish: publish,
    });
    setSaving(null);
    if (error) { onError?.(error.message); return; }
    const res = data as { id: string; published: boolean; title: string };
    setDraft((d) => ({ ...d, id: res.id }));
    onSuccess?.(res.published ? `Published: ${res.title}` : `Saved: ${res.title}`);
    await load();
  };

  const current = draft.id ? rows.find((r) => r.id === draft.id) : undefined;
  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const canSave = draft.title.trim().length >= 4 && draft.content.trim().length >= 200 && !saving;

  const shown = rows.filter((r) => filter === 'all' || (filter === 'published' ? r.published : !r.published));

  return (
    <div className="space-y-6">
      {/* Editor */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg inline-flex items-center gap-2">
            <PenLine className="w-5 h-5" /> {draft.id ? 'Edit article' : 'Write an article'}
          </h3>
          {draft.id && (
            <button type="button" onClick={() => setDraft(EMPTY)} className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>

        <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">Title</label>
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          maxLength={140}
          placeholder="A clear, honest title"
          className="w-full mb-4 rounded-xl bg-white text-gray-900 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-rose-400"
        />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">Written for</label>
            <select
              value={draft.audience}
              onChange={(e) => setDraft({ ...draft, audience: e.target.value as Draft['audience'] })}
              className="w-full rounded-xl bg-white text-gray-900 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="">Everyone</option>
              <option value="diaspora">Members living abroad (shows a "Living abroad" tag)</option>
              <option value="general">Canadian singles generally</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">One-line summary (optional)</label>
            <input
              value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
              maxLength={300}
              placeholder="Shown on the homepage and in the list"
              className="w-full rounded-xl bg-white text-gray-900 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
        </div>

        <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">Article</label>
        <textarea
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          rows={16}
          placeholder={'Write in plain text. Leave an empty line between paragraphs.\n\nSay only what the site actually does; members and reviewers read these.'}
          className="w-full rounded-xl bg-white text-gray-900 px-4 py-3 text-base leading-relaxed outline-none focus:ring-2 focus:ring-rose-400"
        />
        <p className="text-xs text-white/60 mt-1">
          {words} words · about {readMinutes(draft.content || ' ')} min read
          {draft.content.trim().length > 0 && draft.content.trim().length < 200 && ' · needs at least 200 characters'}
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <Button type="button" onClick={() => save(null)} disabled={!canSave} className="bg-white/20 hover:bg-white/30 text-white">
            <Save className="w-4 h-4 mr-2" /> {saving === 'draft' ? 'Saving…' : current?.published ? 'Save changes' : 'Save as draft'}
          </Button>
          {!current?.published && (
            <Button type="button" onClick={() => save(true)} disabled={!canSave} className="bg-rose-500 hover:bg-rose-600 text-white">
              <Eye className="w-4 h-4 mr-2" /> {saving === 'publish' ? 'Publishing…' : 'Publish now'}
            </Button>
          )}
          {current?.published && (
            <Button type="button" onClick={() => save(false)} disabled={!canSave} className="bg-white/10 hover:bg-white/20 text-white">
              <EyeOff className="w-4 h-4 mr-2" /> {saving === 'unpublish' ? 'Taking down…' : 'Take down'}
            </Button>
          )}
        </div>
        <p className="text-xs text-white/50 mt-3">
          Publishing puts the piece on the Care Blog and the homepage at once, and sends one notification to members who allow them
          (only the first time a piece is published). The scheduled Monday and Thursday articles carry on regardless.
        </p>
      </div>

      {/* List */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg inline-flex items-center gap-2"><BookOpen className="w-5 h-5" /> Articles</h3>
          <div className="flex items-center gap-2 text-sm">
            {(['all', 'published', 'drafts'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg ${filter === f ? 'bg-white text-gray-900' : 'text-white/70 hover:bg-white/10'}`}
              >
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
              <div className="min-w-0">
                <p className="font-medium leading-snug truncate">{r.title}</p>
                <p className="text-xs text-white/60 mt-0.5">
                  {r.published
                    ? `Published ${r.published_at ? new Date(r.published_at).toLocaleDateString() : ''}`
                    : r.sort_order != null ? `In the scheduled queue (#${r.sort_order})` : 'Draft'}
                  {r.audience === 'diaspora' && ' · Living abroad'}
                  {r.audience === 'general' && ' · General'}
                  {' · '}{readMinutes(r.content)} min
                </p>
              </div>
              <button type="button" onClick={() => edit(r)} className="shrink-0 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
