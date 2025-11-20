import { supabase } from './supabase';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      message?: string;
    };
    auth: {
      status: 'ok' | 'error';
      message?: string;
    };
    api: {
      status: 'ok' | 'error';
      message?: string;
    };
  };
  uptime: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  unit: string;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  user_id?: string;
}

class MonitoringService {
  private errorLogs: ErrorLog[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private startTime: number = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          level: 'error',
          message: event.message,
          stack: event.error?.stack,
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          level: 'error',
          message: 'Unhandled Promise Rejection',
          stack: event.reason?.stack,
          context: { reason: event.reason },
        });
      });

      if ('performance' in window && 'PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'navigation') {
                const navEntry = entry as PerformanceNavigationTiming;
                this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart, 'ms');
                this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart, 'ms');
                this.recordMetric('time_to_interactive', navEntry.domInteractive - navEntry.fetchStart, 'ms');
              }
            }
          });
          observer.observe({ entryTypes: ['navigation'] });
        } catch (error) {
          console.warn('PerformanceObserver not fully supported:', error);
        }
      }
    }

    this.startHealthChecks();
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(console.error);
    }, 60000);
  }

  public stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      auth: await this.checkAuth(),
      api: await this.checkAPI(),
    };

    const allHealthy = Object.values(checks).every((check) => check.status === 'ok');
    const anyError = Object.values(checks).some((check) => check.status === 'error');

    return {
      status: allHealthy ? 'healthy' : anyError ? 'down' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      uptime: Date.now() - this.startTime,
    };
  }

  private async checkDatabase(): Promise<{ status: 'ok' | 'error'; latency?: number; message?: string }> {
    if (!supabase) {
      return {
        status: 'error',
        message: 'Supabase client not initialized',
      };
    }

    try {
      const startTime = performance.now();
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

      const latency = performance.now() - startTime;

      if (error) {
        return {
          status: 'error',
          latency,
          message: error.message,
        };
      }

      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkAuth(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    if (!supabase) {
      return {
        status: 'error',
        message: 'Supabase client not initialized',
      };
    }

    try {
      const { error } = await supabase.auth.getSession();

      if (error) {
        return {
          status: 'error',
          message: error.message,
        };
      }

      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkAPI(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      return {
        status: 'error',
        message: 'Supabase URL not configured',
      };
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
      });

      if (!response.ok) {
        return {
          status: 'error',
          message: `API returned status ${response.status}`,
        };
      }

      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public logError(error: Omit<ErrorLog, 'id' | 'timestamp'>): void {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...error,
    };

    this.errorLogs.push(errorLog);

    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-100);
    }

    console.error(`[${errorLog.level.toUpperCase()}]`, errorLog.message, errorLog);

    this.persistErrorLog(errorLog).catch(console.error);
  }

  private async persistErrorLog(error: ErrorLog): Promise<void> {
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await supabase.from('error_logs').insert({
          user_id: session.user.id,
          level: error.level,
          message: error.message,
          stack: error.stack,
          context: error.context,
          timestamp: error.timestamp,
        });
      }
    } catch (err) {
      console.warn('Failed to persist error log:', err);
    }
  }

  public recordMetric(name: string, value: number, unit: string = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
    };

    this.performanceMetrics.push(metric);

    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  public getErrorLogs(limit: number = 50): ErrorLog[] {
    return this.errorLogs.slice(-limit);
  }

  public getPerformanceMetrics(metricName?: string, limit: number = 100): PerformanceMetric[] {
    let metrics = this.performanceMetrics;

    if (metricName) {
      metrics = metrics.filter((m) => m.name === metricName);
    }

    return metrics.slice(-limit);
  }

  public getAverageMetric(metricName: string): number | null {
    const metrics = this.performanceMetrics.filter((m) => m.name === metricName);

    if (metrics.length === 0) return null;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  public async trackDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;

      this.recordMetric(`db_query_${queryName}`, duration, 'ms');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordMetric(`db_query_${queryName}_failed`, duration, 'ms');
      this.logError({
        level: 'error',
        message: `Database query failed: ${queryName}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { queryName },
      });

      throw error;
    }
  }

  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  public getUptimeFormatted(): string {
    const uptime = this.getUptime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export const monitoring = new MonitoringService();

export const trackQuery = <T>(queryName: string, queryFn: () => Promise<T>): Promise<T> => {
  return monitoring.trackDatabaseQuery(queryName, queryFn);
};

export const logError = (error: Omit<ErrorLog, 'id' | 'timestamp'>): void => {
  monitoring.logError(error);
};

export const recordMetric = (name: string, value: number, unit?: string): void => {
  monitoring.recordMetric(name, value, unit);
};
