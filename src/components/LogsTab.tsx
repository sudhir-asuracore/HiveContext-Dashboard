'use client';

import { useCallback, useEffect, useState } from 'react';

type AuthLog = {
  id: string;
  username: string;
  auth_method: string;
  status: 'SUCCESS' | 'FAILED' | 'ACCESS_DENIED';
  ip_address?: string | null;
  user_agent?: string | null;
  error_message?: string | null;
  created_at: string;
};

type LogsData = {
  logs: AuthLog[];
  lastAttempt: AuthLog | null;
  lastSuccess: AuthLog | null;
  totalCount: number;
};

export default function LogsTab() {
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/system/logs?limit=50', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load logs');
      setData(json);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Error fetching logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return isoStr;
    }
  };

  const getRelativeTime = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-8 font-mono">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <h2 className="text-xl text-white uppercase tracking-widest flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
            Authentication & Access Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase">
            Audit trail of recent console login attempts, successful sessions, and access denials
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs uppercase text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-red-600 cursor-pointer"
            />
            <span>Live Polling</span>
          </label>

          <button
            onClick={fetchLogs}
            className="px-3 py-1 bg-[#151515] border border-[#333] hover:border-red-600 text-slate-300 hover:text-white text-xs uppercase tracking-wider transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-800 bg-red-950/40 p-4 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Last Logged-in User */}
        <div className="border border-[#222] bg-[#0d0d0d] p-6 relative group hover:border-[#333] transition-colors">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-600"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-600"></div>

          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
            Last Logged-In User
          </div>

          {data?.lastSuccess ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-lg text-white font-bold tracking-wider">
                  {data.lastSuccess.username}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-950/80 border border-emerald-700 text-emerald-300">
                  {data.lastSuccess.auth_method === 'google_oauth' ? 'Google OAuth' : 'Credentials'}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{formatDate(data.lastSuccess.created_at)}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-bold">
                  {getRelativeTime(data.lastSuccess.created_at)}
                </span>
              </div>

              {data.lastSuccess.ip_address && (
                <div className="text-[10px] text-slate-600 truncate">
                  IP: {data.lastSuccess.ip_address}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-600 uppercase">
              {loading ? 'Loading...' : 'No successful login recorded yet.'}
            </div>
          )}
        </div>

        {/* Last Login Attempt */}
        <div className="border border-[#222] bg-[#0d0d0d] p-6 relative group hover:border-[#333] transition-colors">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>

          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
            Last Login Attempt
          </div>

          {data?.lastAttempt ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-lg text-white font-bold tracking-wider">
                  {data.lastAttempt.username}
                </span>
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${
                    data.lastAttempt.status === 'SUCCESS'
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      : data.lastAttempt.status === 'ACCESS_DENIED'
                      ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                      : 'bg-red-950/80 border-red-700 text-red-300'
                  }`}
                >
                  {data.lastAttempt.status}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{formatDate(data.lastAttempt.created_at)}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-bold">
                  {getRelativeTime(data.lastAttempt.created_at)}
                </span>
              </div>

              {data.lastAttempt.error_message && (
                <div className="text-[10px] text-red-400/80 truncate">
                  Error: {data.lastAttempt.error_message}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-600 uppercase">
              {loading ? 'Loading...' : 'No login attempt recorded yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Logs Data Table */}
      <div className="border border-[#222]">
        <div className="p-4 border-b border-[#222] bg-[#0f0f0f] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Audit Trail ({data?.logs?.length || 0} events)
          </span>
          <span className="text-[10px] text-slate-600 uppercase">Stored in CockroachDB</span>
        </div>

        <div className="text-xs uppercase text-slate-500 grid grid-cols-12 p-3 border-b border-[#222] font-bold bg-[#0a0a0a]">
          <div className="col-span-3 px-2">Timestamp</div>
          <div className="col-span-3 px-2">User / Identity</div>
          <div className="col-span-2 px-2">Method</div>
          <div className="col-span-2 px-2">Status</div>
          <div className="col-span-2 px-2 text-right">Details</div>
        </div>

        <div className="divide-y divide-[#1a1a1a]">
          {loading && !data && (
            <div className="py-8 text-center text-xs text-slate-600 uppercase tracking-widest">
              Fetching audit logs...
            </div>
          )}

          {!loading && (!data?.logs || data.logs.length === 0) && (
            <div className="py-8 text-center text-xs text-slate-600 uppercase tracking-widest">
              No authentication logs found in database.
            </div>
          )}

          {data?.logs?.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-12 items-center text-xs py-3 px-1 hover:bg-[#121212] transition-colors"
            >
              <div className="col-span-3 px-2 text-slate-400 font-mono text-[11px]">
                {formatDate(log.created_at)}
              </div>

              <div className="col-span-3 px-2 text-white font-bold truncate" title={log.username}>
                {log.username}
              </div>

              <div className="col-span-2 px-2">
                <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-[#1c1c1c] border border-[#333] text-slate-300">
                  {log.auth_method === 'google_oauth' ? 'Google OAuth' : 'Password'}
                </span>
              </div>

              <div className="col-span-2 px-2">
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
                      : log.status === 'ACCESS_DENIED'
                      ? 'bg-amber-950/60 border-amber-700/60 text-amber-400'
                      : 'bg-red-950/60 border-red-700/60 text-red-400'
                  }`}
                >
                  {log.status}
                </span>
              </div>

              <div className="col-span-2 px-2 text-right text-[10px] text-slate-500 truncate" title={log.error_message || log.ip_address || 'OK'}>
                {log.error_message ? (
                  <span className="text-red-400">{log.error_message}</span>
                ) : log.ip_address ? (
                  <span>IP: {log.ip_address}</span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
