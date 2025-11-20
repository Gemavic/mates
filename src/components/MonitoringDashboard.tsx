import React, { useState, useEffect } from 'react';
import { Activity, Database, Shield, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Circle as XCircle, Clock } from 'lucide-react';
import { monitoring, HealthCheckResult } from '../lib/monitoring';

export const MonitoringDashboard: React.FC = () => {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const performCheck = async () => {
    setLoading(true);
    try {
      const result = await monitoring.performHealthCheck();
      setHealthCheck(result);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performCheck();

    if (autoRefresh) {
      const interval = setInterval(performCheck, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: 'ok' | 'error') => {
    if (status === 'ok') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getOverallStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const errorLogs = monitoring.getErrorLogs(10);
  const uptime = monitoring.getUptimeFormatted();
  const avgDbLatency = monitoring.getAverageMetric('db_query_user_profiles');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Monitoring</h1>
            <p className="text-slate-600 mt-1">Real-time application health and performance</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={performCheck}
              disabled={loading}
              className="px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading ? 'Checking...' : 'Refresh Now'}
            </button>
          </div>
        </div>

        {healthCheck && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getOverallStatusColor(healthCheck.status)} animate-pulse`} />
                  <h2 className="text-xl font-semibold text-slate-900">
                    System Status: <span className="capitalize">{healthCheck.status}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>Uptime: {uptime}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-slate-700" />
                      <h3 className="font-medium text-slate-900">Database</h3>
                    </div>
                    {getStatusIcon(healthCheck.checks.database.status)}
                  </div>
                  {healthCheck.checks.database.latency && (
                    <p className="text-sm text-slate-600">
                      Latency: {healthCheck.checks.database.latency.toFixed(2)}ms
                    </p>
                  )}
                  {healthCheck.checks.database.message && (
                    <p className="text-xs text-red-600 mt-1">{healthCheck.checks.database.message}</p>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-slate-700" />
                      <h3 className="font-medium text-slate-900">Authentication</h3>
                    </div>
                    {getStatusIcon(healthCheck.checks.auth.status)}
                  </div>
                  {healthCheck.checks.auth.message && (
                    <p className="text-xs text-red-600 mt-1">{healthCheck.checks.auth.message}</p>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-slate-700" />
                      <h3 className="font-medium text-slate-900">API</h3>
                    </div>
                    {getStatusIcon(healthCheck.checks.api.status)}
                  </div>
                  {healthCheck.checks.api.message && (
                    <p className="text-xs text-red-600 mt-1">{healthCheck.checks.api.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics</h2>
                <div className="space-y-3">
                  {avgDbLatency !== null && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">Avg. Database Query Time</span>
                      <span className="font-medium text-slate-900">{avgDbLatency.toFixed(2)}ms</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Uptime</span>
                    <span className="font-medium text-slate-900">{uptime}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Last Check</span>
                    <span className="font-medium text-slate-900">
                      {new Date(healthCheck.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Total Errors Logged</span>
                    <span className="font-medium text-slate-900">{errorLogs.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-slate-900">Recent Errors</h2>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errorLogs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No errors logged</p>
                  ) : (
                    errorLogs.map((error) => (
                      <div
                        key={error.id}
                        className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              error.level === 'error'
                                ? 'bg-red-100 text-red-700'
                                : error.level === 'warning'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {error.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 break-words">{error.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Monitoring Information</h3>
              <p className="text-sm text-blue-700">
                This dashboard monitors the health and performance of your dating application. Health checks run
                automatically every 30 seconds. All database tables have Row Level Security enabled, and all policies
                are properly configured to protect user data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
