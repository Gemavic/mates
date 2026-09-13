import React, { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { Globe, Users, MousePointerClick, UserPlus, RefreshCw, TrendingUp } from 'lucide-react';

interface Totals {
  page_views: number;
  unique_sessions: number;
  signups: number;
  ad_clicks: number;
  signed_in_views?: number;
}

interface Summary {
  error?: string;
  window?: {
    days: number;
    starts: string;
    ends: string;
    timezone: string;
    includes_staff: boolean;
    staff_views_excluded: number;
  };
  totals?: Totals;
  previous?: Totals;
  by_source?: Array<{ source: string; views: number; sessions: number; signups: number }>;
  by_day?: Array<{ day: string; views: number; signups: number; ad_clicks: number }>;
  top_pages?: Array<{ path: string; views: number; sessions: number }>;
  ad_positions?: Array<{ position: string; clicks: number }>;
  campaigns?: Array<{ campaign: string; medium: string; views: number; signups: number }>;
}

// The windows offered. All of them are whole calendar days in Toronto, so
// "Today" is today so far rather than a rolling 24 hours - a sliding window is
// what made these figures appear to count backwards in the first place.
const WINDOWS: Array<{ days: number; label: string }> = [
  { days: 1, label: 'Today' },
  { days: 3, label: '3d' },
  { days: 7, label: '7d' },
  { days: 15, label: '15d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

export const TrafficAnalytics: React.FC = () => {
  const [days, setDays] = useState(7);
  const [includeStaff, setIncludeStaff] = useState(false);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (windowDays: number, withStaff: boolean) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabaseClient.rpc('staff_traffic_summary', {
        p_days: windowDays,
        p_include_staff: withStaff,
      });
      setData(error ? { error: error.message } : (result as Summary));
    } catch (e: any) {
      setData({ error: e?.message || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days, includeStaff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, includeStaff]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
        {data?.error === 'forbidden'
          ? 'Your account does not have staff analytics access.'
          : `Could not load analytics${data?.error ? `: ${data.error}` : ''}. Make sure the traffic analytics migration has been run.`}
      </div>
    );
  }

  const t = data.totals!;
  const prev = data.previous;
  const win = data.window;
  const maxDayViews = Math.max(1, ...(data.by_day ?? []).map((d) => d.views));
  const conversion =
    t.unique_sessions > 0 ? ((t.signups / t.unique_sessions) * 100).toFixed(1) : '0.0';
  const prevConversion =
    prev && prev.unique_sessions > 0 ? (prev.signups / prev.unique_sessions) * 100 : undefined;

  // The window is the last N calendar days in Toronto, so within a day these
  // only climb. At midnight the oldest day drops off and a figure can step
  // down - which is a real change in traffic, not a broken counter. Printing
  // the change against the previous N days is what makes that readable.
  const statCards: Array<{
    label: string; value: string | number; now: number; was?: number;
    icon: typeof Globe; tint: string; suffix?: string;
  }> = [
    { label: 'Page views', value: t.page_views, now: t.page_views, was: prev?.page_views, icon: Globe, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Unique sessions', value: t.unique_sessions, now: t.unique_sessions, was: prev?.unique_sessions, icon: Users, tint: 'bg-purple-50 text-purple-600' },
    { label: 'Signups', value: t.signups, now: t.signups, was: prev?.signups, icon: UserPlus, tint: 'bg-green-50 text-green-600' },
    { label: 'Ad clicks', value: t.ad_clicks, now: t.ad_clicks, was: prev?.ad_clicks, icon: MousePointerClick, tint: 'bg-rose-50 text-rose-600' },
    { label: 'Visitor → signup', value: `${conversion}%`, now: Number(conversion), was: prevConversion, icon: TrendingUp, tint: 'bg-amber-50 text-amber-600', suffix: 'pp' },
  ];

  const formatDay = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

  // "vs previous 1 days" is not English.
  const comparedWith = days === 1 ? 'yesterday' : `previous ${days} days`;

  return (
    <div className="space-y-6">
      {/* Window selector. The title sits on its own line: six windows plus the
          refresh button do not share a row with a heading on a phone. */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Traffic & Ad Performance</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setDays(w.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === w.days ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {w.label}
            </button>
          ))}
          <button
            onClick={() => load(days, includeStaff)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* What the numbers below actually cover. Without this the totals look
          like a tally that should only ever rise. */}
      {win && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
          <p>
            <span className="font-medium text-gray-800">
              {win.days === 1
                ? formatDay(win.ends)
                : `${formatDay(win.starts)} – ${formatDay(win.ends)}`}
            </span>{' '}
            · {win.days === 1 ? 'today so far' : `${win.days} calendar days, today included`}, Toronto
            time. Today is still filling up, so read the change on each tile rather than comparing
            with what you saw yesterday.
          </p>
          <p className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStaff}
                onChange={(e) => setIncludeStaff(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Include staff visits</span>
            </label>
            {!includeStaff && win.staff_views_excluded > 0 && (
              <span className="text-gray-500">
                {win.staff_views_excluded.toLocaleString()} page{' '}
                {win.staff_views_excluded === 1 ? 'view' : 'views'} from staff accounts left out.
                Staff browsing before signing in still counts as a visitor.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((c) => {
          const delta = c.was === undefined ? null : Number((c.now - c.was).toFixed(1));
          return (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.tint}`}>
                <c.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              {delta !== null && (
                <p
                  className={`text-[11px] mt-1 font-medium ${
                    delta > 0 ? 'text-green-600' : delta < 0 ? 'text-rose-600' : 'text-gray-400'
                  }`}
                  title={`${comparedWith[0].toUpperCase()}${comparedWith.slice(1)}: ${c.was}`}
                >
                  {delta > 0 ? '+' : ''}{delta}{c.suffix ?? ''} vs {comparedWith}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Daily trend (14 days) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-semibold text-gray-900 mb-4 text-sm">Last 14 days — daily views{includeStaff ? '' : ', staff excluded'}</h4>
        {(data.by_day ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No traffic recorded yet.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-28">
            {data.by_day!.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.views} views, ${d.signups} signups`}>
                <div
                  className="w-full bg-rose-400 rounded-t"
                  style={{ height: `${Math.max(4, (d.views / maxDayViews) * 100)}%` }}
                />
                <span className="text-[9px] text-gray-400">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Traffic sources */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Where visitors come from</h4>
          {(data.by_source ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No sources recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium text-right">Sessions</th>
                  <th className="pb-2 font-medium text-right">Views</th>
                  <th className="pb-2 font-medium text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {data.by_source!.map((s) => (
                  <tr key={s.source} className="border-b border-gray-50">
                    <td className="py-2 text-gray-800 font-medium">{s.source}</td>
                    <td className="py-2 text-right text-gray-600">{s.sessions}</td>
                    <td className="py-2 text-right text-gray-600">{s.views}</td>
                    <td className="py-2 text-right text-gray-600">{s.signups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top screens */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Most viewed screens</h4>
          {(data.top_pages ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No page views recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.top_pages!.map((p) => {
                const max = data.top_pages![0].views || 1;
                return (
                  <div key={p.path}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700">{p.path}</span>
                      <span className="text-gray-500">{p.views}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400"
                        style={{ width: `${(p.views / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ad performance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Ad clicks by placement</h4>
          {(data.ad_positions ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">
              No ad clicks yet. Call <code className="bg-gray-100 px-1 rounded">trackAdClick('position')</code> from ad components to populate this.
            </p>
          ) : (
            <div className="space-y-2">
              {data.ad_positions!.map((a) => {
                const max = data.ad_positions![0].clicks || 1;
                return (
                  <div key={a.position}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700">{a.position}</span>
                      <span className="text-gray-500">{a.clicks}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400" style={{ width: `${(a.clicks / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Campaigns (UTM)</h4>
          {(data.campaigns ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">
              No campaign traffic yet. Share links like{' '}
              <code className="bg-gray-100 px-1 rounded break-all">?utm_source=instagram&utm_campaign=launch</code>{' '}
              to track marketing efforts here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Campaign</th>
                  <th className="pb-2 font-medium text-right">Views</th>
                  <th className="pb-2 font-medium text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns!.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-800">{c.campaign}{c.medium ? ` · ${c.medium}` : ''}</td>
                    <td className="py-2 text-right text-gray-600">{c.views}</td>
                    <td className="py-2 text-right text-gray-600">{c.signups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
