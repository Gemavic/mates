import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface AbuseReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  reporter_email?: string;
  reported_user_email?: string;
}

interface ModerationQueueItem {
  id: string;
  user_id: string;
  content_type: string;
  reason: string;
  severity: string;
  status: string;
  created_at: string;
}

export const ModerationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'queue' | 'actions'>('reports');
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AbuseReport | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        await loadReports();
      } else if (activeTab === 'queue') {
        await loadQueue();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    const { data, error } = await supabase
      .from('abuse_reports')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setReports(data);
    }
  };

  const loadQueue = async () => {
    const { data, error } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setQueue(data);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolve' | 'escalate' | 'dismiss', notes?: string) => {
    const newStatus = action === 'resolve' ? 'resolved' : action === 'escalate' ? 'escalated' : 'dismissed';

    const { error } = await supabase
      .from('abuse_reports')
      .update({
        status: newStatus,
        resolution_notes: notes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (!error) {
      loadReports();
      setSelectedReport(null);
    }
  };

  const handleQueueAction = async (queueId: string, action: 'approve' | 'reject', notes?: string) => {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: newStatus,
        review_notes: notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (!error) {
      loadQueue();
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800',
      escalated: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Moderation Dashboard</h1>
        <p className="text-gray-600">Review and manage reported content and users</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'reports'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Abuse Reports ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'queue'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Review Queue ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'actions'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Action Log
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading...</p>
            </div>
          ) : activeTab === 'reports' ? (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No reports to review</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(report.priority)}`}>
                          {report.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold text-gray-900 mb-1">
                        Report Type: {report.report_type.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </div>

                    <div className="flex gap-2 text-xs text-gray-600 mb-3">
                      <span>Reporter: {report.reporter_id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>Reported User: {report.reported_user_id.slice(0, 8)}</span>
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReportAction(report.id, 'resolve', 'Issue resolved after review')}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'escalate', 'Escalated for further action')}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
                        >
                          Escalate
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'dismiss', 'Report dismissed after review')}
                          className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'queue' ? (
            <div className="space-y-4">
              {queue.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No items in queue</p>
                </div>
              ) : (
                queue.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(item.severity)}`}>
                          {item.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold text-gray-900">
                        {item.content_type.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">{item.reason}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQueueAction(item.id, 'approve', 'Content approved')}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleQueueAction(item.id, 'reject', 'Content rejected')}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Action log coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
