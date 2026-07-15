import React, { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { Globe, Users, MousePointerClick, UserPlus, RefreshCw, TrendingUp } from 'lucide-react';

interface Summary {
  error?: string;
  totals?: {
    page_views: number;
    unique_sessions: number;
    signups: number;
    ad_clicks: number;
    signed_in_views: number;
  };
  by_source?: Array<{ source: string; views: number; sessions: number; signups: number }>;
  by_day?: Array<{ day: string; views: number; signups: number; ad_clicks: number }>;
  top_pages?: Array<{ path: string; views: number; sessions: number }>;
  ad_positions?: Array<{ position: string; clicks: number }>;
  campaigns?: Array<{ campaign: string; medium: string; views: number; signups: number }>;
}

export const TrafficAnalytics: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (windowDays: number) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabaseClient.rpc('staff_traffic_summary', {
        p_days: windowDays,
      });
      setData(error ? { error: error.message } : (result as Summary));
    } catch (e: any) {
      setData({ error: e?.message || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

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
  const maxDayViews = Math.max(1, ...(data.by_day ?? []).map((d) => d.views));
  const conversion =
    t.unique_sessions > 0 ? ((t.signups / t.unique_sessions) * 100).toFixed(1) : '0.0';

  const statCards = [
    { label: 'Page views', value: t.page_views, icon: Globe, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Unique sessions', value: t.unique_sessions, icon: Users, tint: 'bg-purple-50 text-purple-600' },
    { label: 'Signups', value: t.signups, icon: UserPlus, tint: 'bg-green-50 text-green-600' },
    { label: 'Ad clicks', value: t.ad_clicks, icon: MousePointerClick, tint: 'bg-rose-50 text-rose-600' },
    { label: 'Visitor → signup', value: `${conversion}%`, icon: TrendingUp, tint: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Window selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Traffic & Ad Performance</h3>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => load(days)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.tint}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend (14 days) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-semibold text-gray-900 mb-4 text-sm">Last 14 days — daily views</h4>
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
