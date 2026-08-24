import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Flag, Check, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

/**
 * Moderation review.
 *
 * Image scanning and abuse reporting both file into tables that, until now,
 * nothing displayed - a review queue nobody can read is not a safety net. This
 * is the screen that makes those two features actually mean something.
 *
 * Visibility is decided by RLS (can_moderate()), not by this component: a
 * non-admin who forces their way here simply gets empty lists.
 */

interface QueueItem {
  id: string;
  user_id: string;
  content_type: string;
  content_url: string | null;
  reason: string;
  severity: string | null;
  status: string | null;
  created_at: string | null;
}

interface AbuseReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: string;
  description: string | null;
  context_type: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
}

interface ModerationQueueProps {
  onNavigate: (screen: string) => void;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

/** The queue stores a URL either in content_url or appended to reason. */
function imageUrlOf(item: QueueItem): string | null {
  if (item.content_url) return item.content_url;
  const match = item.reason.match(/\((https?:\/\/[^\s)]+)\)/);
  return match ? match[1] : null;
}

export const ModerationQueue: React.FC<ModerationQueueProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'content' | 'reports'>('content');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [queueRes, reportRes] = await Promise.all([
        supabaseClient
          .from('moderation_queue')
          .select('id, user_id, content_type, content_url, reason, severity, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(100),
        supabaseClient
          .from('abuse_reports')
          .select('id, reporter_id, reported_user_id, report_type, description, context_type, status, priority, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const queue = (queueRes.data ?? []) as QueueItem[];
      const abuse = (reportRes.data ?? []) as AbuseReport[];
      setItems(queue);
      setReports(abuse);

      // Resolve the user ids on screen to names in one query.
      const ids = Array.from(
        new Set([
          ...queue.map((q) => q.user_id),
          ...abuse.flatMap((r) => [r.reporter_id, r.reported_user_id]),
        ])
      ).filter(Boolean);

      if (ids.length) {
        const { data: profiles } = await supabaseClient
          .from('user_profiles')
          .select('user_id, first_name, full_name')
          .in('user_id', ids);

        const lookup: Record<string, string> = {};
        for (const p of profiles ?? []) {
          lookup[p.user_id] =
            (p.first_name ?? '').trim() || (p.full_name ?? '').trim() || 'Member';
        }
        setNames(lookup);
      }
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveItem = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    const { error } = await supabaseClient
      .from('moderation_queue')
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setBusyId(null);
    if (error) {
      alert(`Could not update: ${error.message}`);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    setBusyId(id);
    const { error } = await supabaseClient
      .from('abuse_reports')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);
    setBusyId(null);
    if (error) {
      alert(`Could not update: ${error.message}`);
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const nameOf = (id: string) => names[id] ?? 'Member';

  return (
    <Layout title="Moderation" onBack={() => onNavigate('discovery')}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('content')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === 'content' ? 'bg-rose-600 text-white' : 'bg-white text-gray-700 border'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Flagged content ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('reports')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === 'reports' ? 'bg-rose-600 text-white' : 'bg-white text-gray-700 border'
                }`}
              >
                <Flag className="h-4 w-4" />
                Reports ({reports.length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border bg-white p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading && <p className="py-12 text-center text-gray-500">Loading…</p>}

          {!loading && tab === 'content' && (
            <div className="space-y-3">
              {items.length === 0 && (
                <p className="rounded-xl bg-white p-8 text-center text-gray-500">
                  Nothing waiting for review.
                </p>
              )}
              {items.map((item) => {
                const url = imageUrlOf(item);
                return (
                  <div key={item.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start gap-4">
                      {url && (
                        <img
                          src={url}
                          alt="Flagged content"
                          className="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">{nameOf(item.user_id)}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              SEVERITY_STYLE[item.severity ?? 'low'] ?? SEVERITY_STYLE.low
                            }`}
                          >
                            {item.severity ?? 'low'}
                          </span>
                          <span className="text-xs text-gray-500">{item.content_type}</span>
                        </div>
                        <p className="break-words text-sm text-gray-700">{item.reason}</p>
                        {item.created_at && (
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void resolveItem(item.id, 'approved')}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        <Check className="mr-1 h-4 w-4" /> Allow
                      </Button>
                      <Button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void resolveItem(item.id, 'rejected')}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && tab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 && (
                <p className="rounded-xl bg-white p-8 text-center text-gray-500">
                  No open reports.
                </p>
              )}
              {reports.map((report) => (
                <div key={report.id} className="rounded-xl border bg-white p-4">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {nameOf(report.reporter_id)} reported {nameOf(report.reported_user_id)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        SEVERITY_STYLE[report.priority ?? 'low'] ?? SEVERITY_STYLE.low
                      }`}
                    >
                      {report.priority ?? 'low'}
                    </span>
                    <span className="text-xs text-gray-500">{report.report_type}</span>
                  </div>
                  {report.description && (
                    <p className="break-words text-sm text-gray-700">{report.description}</p>
                  )}
                  {report.created_at && (
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(report.created_at).toLocaleString()}
                      {report.context_type ? ` · ${report.context_type}` : ''}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void resolveReport(report.id, 'resolved')}
                      className="bg-rose-600 text-white hover:bg-rose-700"
                    >
                      <Check className="mr-1 h-4 w-4" /> Actioned
                    </Button>
                    <Button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void resolveReport(report.id, 'dismissed')}
                      variant="outline"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
