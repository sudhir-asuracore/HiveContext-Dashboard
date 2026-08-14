'use client';

import { useCallback, useEffect, useState } from 'react';

type ReembedJob = {
  status: string;
  totalCount: number;
  processedCount: number;
  failedCount: number;
  errorMessage?: string | null;
};

type McpServerInfo = {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNCONFIGURED';
  url: string | null;
  latencyMs: number;
  error?: string;
};

type Health = {
  mcpServer?: McpServerInfo;
  cluster: { database: string; version: string; status: string };
  usage: { activeMemories: number; deletedMemories: number };
  embedding: {
    provider: string;
    model: string;
    dimensions: number;
    incompatibleMemories: number;
    healthy: boolean;
  };
  reembedJob: ReembedJob | null;
};

export default function HealthTab() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/system/health', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Health check failed.');
    setHealth(data);
    setError('');
    return data as Health;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/system/health', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Health check failed.');
        return data as Health;
      })
      .then(data => {
        if (!cancelled) setHealth(data);
      })
      .catch(error => {
        if (!cancelled) setError(error.message);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (health?.reembedJob?.status !== 'running') return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/system/health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'batch', batchSize: 5 }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Re-embedding batch failed.');
        await refresh();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Re-embedding failed.');
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [health?.reembedJob?.processedCount, health?.reembedJob?.status, refresh]);

  const startReembed = async () => {
    if (!health) return;
    const count = health.embedding.incompatibleMemories;
    if (!window.confirm(`Reprocess ${count} memories with ${health.embedding.model} (${health.embedding.dimensions} dimensions)? Semantic search is unavailable while the vector index is rebuilt.`)) return;
    setWorking(true);
    try {
      const response = await fetch('/api/system/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start re-embedding.');
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not start re-embedding.');
    } finally {
      setWorking(false);
    }
  };

  if (error && !health) return <div className="border border-red-900 bg-red-950/20 p-6 text-red-300">{error}</div>;
  if (!health) return <div className="border border-[#222] p-8 text-slate-500">Checking deployment health...</div>;

  const job = health.reembedJob;
  const completed = (job?.processedCount ?? 0) + (job?.failedCount ?? 0);
  const progress = job?.totalCount ? Math.min(100, Math.round((completed / job.totalCount) * 100)) : 100;
  const mcp = health.mcpServer;

  const getMcpStatusBadge = () => {
    if (!mcp || mcp.status === 'ONLINE') {
      return <span className="text-emerald-400 font-bold">ONLINE</span>;
    }
    if (mcp.status === 'DEGRADED') {
      return <span className="text-amber-400 font-bold">DEGRADED</span>;
    }
    if (mcp.status === 'UNCONFIGURED') {
      return <span className="text-slate-400 font-bold">UNCONFIGURED</span>;
    }
    return <span className="text-red-500 font-bold">OFFLINE</span>;
  };

  return (
    <div className="space-y-8">
      {error && <div className="border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">{error}</div>}
      
      {/* Metrics Row */}
      <section className="grid gap-4 md:grid-cols-4">
        <Metric 
          label="MCP Server" 
          value={getMcpStatusBadge()} 
          detail={mcp?.url ? `${mcp.url} (${mcp.latencyMs}ms)` : (mcp?.error || 'URL Not Set')} 
        />
        <Metric label="Cluster" value={health.cluster.status.toUpperCase()} detail={health.cluster.database} />
        <Metric label="Active memories" value={String(health.usage.activeMemories)} detail={`${health.usage.deletedMemories} soft-deleted`} />
        <Metric label="Database" value="CockroachDB" detail={health.cluster.version} />
      </section>

      {/* Embeddings Section */}
      <section className={`border p-8 ${health.embedding.healthy ? 'border-emerald-900 bg-emerald-950/10' : 'border-amber-700 bg-amber-950/10'}`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Embeddings health</p>
            <h2 className={`mt-2 text-2xl font-bold ${health.embedding.healthy ? 'text-emerald-400' : 'text-amber-300'}`}>
              {health.embedding.healthy ? 'HEALTHY' : 'RE-EMBEDDING REQUIRED'}
            </h2>
            <p className="mt-3 text-sm text-slate-400">{health.embedding.provider} / {health.embedding.model} / {health.embedding.dimensions} dimensions</p>
            {!health.embedding.healthy && <p className="mt-4 max-w-2xl text-sm text-amber-200">{health.embedding.incompatibleMemories} memories are missing embeddings or use a different provider, model, or vector dimension.</p>}
          </div>
          {!health.embedding.healthy && job?.status !== 'running' && <button disabled={working} onClick={startReembed} className="border border-amber-500 px-5 py-3 text-xs font-bold uppercase tracking-widest text-amber-200 hover:bg-amber-500 hover:text-black disabled:opacity-50">{working ? 'Starting...' : `Re-embed ${health.embedding.incompatibleMemories} memories`}</button>}
        </div>
        {job && <div className="mt-8 border-t border-[#333] pt-6">
          <div className="mb-2 flex justify-between text-xs uppercase tracking-wider text-slate-400"><span>{job.status.replaceAll('_', ' ')}</span><span>{completed} / {job.totalCount} ({progress}%)</span></div>
          <div className="h-2 overflow-hidden bg-[#222]"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
          {job.failedCount > 0 && <p className="mt-3 text-xs text-red-300">{job.failedCount} failed. {job.errorMessage}</p>}
        </div>}
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="border border-[#222] bg-[#0d0d0d] p-5">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
      <p className="mt-2 truncate text-xs text-slate-500" title={detail}>{detail}</p>
    </div>
  );
}