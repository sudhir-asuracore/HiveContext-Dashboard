'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MemorySpaceSelector from '@/components/MemorySpaceSelector';
import { useMemorySpace } from '@/context/MemorySpaceContext';

type HiveContext = {
  id: string;
  context_type: string;
  topic: string;
  content: string;
  author_role: string;
  status: string;
  retrieval_count: number;
  scope?: string;
  project_name?: string;
  created_at: string;
  deleted_at?: string;
  metadata?: {
    conflict_ids?: string[];
  };
};

export default function Dashboard() {
  const [contexts, setContexts] = useState<HiveContext[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeSpace } = useMemorySpace();

  // Editing state (Popup Modal)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editScope, setEditScope] = useState<'global' | 'project'>('global');
  const [editProjectName, setEditProjectName] = useState('');
  
  // Scope Filter State
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'project'>('all');
  
  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Conflict UI State
  const [conflictModalOpen, setConflictModalOpen] = useState<HiveContext | null>(null);

  // Pending Review Detail Modal State
  const [pendingModalOpen, setPendingModalOpen] = useState<HiveContext | null>(null);

  // Auto Refresh / Polling State (ON by default)
  const [autoRefresh, setAutoRefresh] = useState(true);

  // MCP Server Health State
  const [mcpHealth, setMcpHealth] = useState<{ status: string; latencyMs: number } | null>(null);

  // Pending Reviews Sorting & Pagination
  const [pendingSortField, setPendingSortField] = useState<'context_type' | 'topic' | 'created_at' | 'status' | 'author_role'>('created_at');
  const [pendingSortOrder, setPendingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pendingPage, setPendingPage] = useState(1);
  const PENDING_PAGE_SIZE = 5;

  // Memory Management Sorting & Pagination
  const [memorySortField, setMemorySortField] = useState<'status' | 'context_type' | 'topic' | 'content' | 'retrieval_count'>('topic');
  const [memorySortOrder, setMemorySortOrder] = useState<'asc' | 'desc'>('asc');
  const [memoryPage, setMemoryPage] = useState(1);
  const MEMORY_PAGE_SIZE = 8;

  const handlePendingSort = (field: typeof pendingSortField) => {
    if (pendingSortField === field) {
      setPendingSortOrder(pendingSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPendingSortField(field);
      setPendingSortOrder('asc');
    }
    setPendingPage(1);
  };

  const handleMemorySort = (field: typeof memorySortField) => {
    if (memorySortField === field) {
      setMemorySortOrder(memorySortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setMemorySortField(field);
      setMemorySortOrder('asc');
    }
    setMemoryPage(1);
  };

  const renderSortIndicator = (currentField: string, targetField: string, order: 'asc' | 'desc') => {
    if (currentField !== targetField) return <span className="text-slate-700 ml-1 text-[10px]">↕</span>;
    return <span className="text-red-500 ml-1 text-[10px] font-bold">{order === 'asc' ? '▲' : '▼'}</span>;
  };

  const pendingItems = contexts.filter(c => {
    if (c.status !== 'pending') return false;
    return true;
  }).sort((a, b) => {
    let valA: any = a[pendingSortField] || '';
    let valB: any = b[pendingSortField] || '';
    if (pendingSortField === 'created_at') {
      valA = new Date(a.created_at).getTime();
      valB = new Date(b.created_at).getTime();
    }
    if (valA < valB) return pendingSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return pendingSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedPending = pendingItems.slice(
    (pendingPage - 1) * PENDING_PAGE_SIZE,
    pendingPage * PENDING_PAGE_SIZE
  );

  const memoryItems = contexts.filter(c => {
    if (c.status === 'pending' || c.status === 'deleted') return false;
    
    if (scopeFilter === 'global') return c.scope === 'global' || !c.scope;
    if (scopeFilter === 'project') return c.scope === 'project';
    return true;
  }).sort((a, b) => {
    let valA: any = a[memorySortField] || '';
    let valB: any = b[memorySortField] || '';
    if (memorySortField === 'retrieval_count') {
      valA = Number(a.retrieval_count || 0);
      valB = Number(b.retrieval_count || 0);
    }
    if (valA < valB) return memorySortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return memorySortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedMemory = memoryItems.slice(
    (memoryPage - 1) * MEMORY_PAGE_SIZE,
    memoryPage * MEMORY_PAGE_SIZE
  );

  const renderPagination = (currentPage: number, totalItems: number, pageSize: number, onPageChange: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-2 text-xs uppercase text-slate-500 border-t border-[#222] gap-4">
        <div>
          Showing <span className="text-white font-bold">{startItem}–{endItem}</span> of <span className="text-white font-bold">{totalItems}</span> items
        </div>
        <div className="flex items-center gap-2 font-bold">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-[#111] border border-[#222] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors uppercase text-[10px]"
          >
            &lt; PREV
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 text-[10px] border transition-colors ${
                currentPage === p
                  ? 'bg-red-600 border-red-500 text-white font-bold shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'bg-[#111] border-[#222] text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-[#111] border border-[#222] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors uppercase text-[10px]"
          >
            NEXT &gt;
          </button>
        </div>
      </div>
    );
  };

  const formatTokens = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(3).replace(/\.?0+$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  const renderScopeBadge = (scope?: string, projectName?: string) => {
    if (scope === 'project' && projectName) {
      return (
        <span className="bg-purple-900/40 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
          PROJ: {projectName}
        </span>
      );
    }
    return (
      <span className="bg-blue-900/40 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
        GLOBAL
      </span>
    );
  };

  const renderContextType = (type: string) => {
    const t = type.replace('_', ' ').toUpperCase();
    if (type === 'convention') return <span className="text-blue-400">{t}</span>;
    if (type === 'post_mortem') return <span className="text-red-400">{t}</span>;
    if (type === 'architecture_decision') return <span className="text-amber-400 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg> ADR</span>;
    if (type === 'infrastructure_context') return <span className="text-emerald-400 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg> INFRA</span>;
    return <span className="text-slate-400">{t}</span>;
  };

  const fetchMcpHealth = async () => {
    try {
      const healthRes = await fetch('/api/system/health', { cache: 'no-store' });
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        if (healthData?.mcpServer) {
          setMcpHealth({
            status: healthData.mcpServer.status || 'ONLINE',
            latencyMs: healthData.mcpServer.latencyMs || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch MCP health', error);
    }
  };

  const fetchContexts = async () => {
    try {
      const url = activeSpace.type !== 'ALL' ? `/api/contexts?space=${encodeURIComponent(activeSpace.dbName)}` : '/api/contexts';
      const res = await fetch(url);
      const data = await res.json();
      setContexts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch contexts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContexts();
    fetchMcpHealth();
  }, [activeSpace]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchContexts();
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchContexts();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const toggleActiveStatus = async (id: string, currentStatus: string) => {
    const newStatus = ['approved', 'auto_approved'].includes(currentStatus) ? 'disabled' : 'approved';
    await updateStatus(id, newStatus);
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      await fetch(`/api/contexts/${deleteConfirmId}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchContexts();
    }
  };

  const startEdit = (ctx: HiveContext) => {
    setEditingId(ctx.id);
    setEditTopic(ctx.topic);
    setEditContent(ctx.content);
    setEditScope((ctx.scope as 'global' | 'project') || 'global');
    setEditProjectName(ctx.project_name || '');
  };

  const executeEdit = async () => {
    if (!editingId) return;
    await fetch(`/api/contexts/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topic: editTopic, 
        content: editContent,
        scope: editScope,
        project_name: editScope === 'project' ? editProjectName : null
      }),
    });
    setEditingId(null);
    fetchContexts();
  };

  const pendingCount = contexts.filter(c => c.status === 'pending').length;
  const approvedCount = contexts.filter(c => ['approved', 'auto_approved'].includes(c.status)).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-mono flex">
      <Sidebar />

      <div className="flex-1 p-10 max-w-7xl mx-auto space-y-12">
        {/* Top Header Row with Global Memory Space Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div className="flex items-center text-[10px] tracking-widest uppercase text-slate-500">
            CONSOLE &gt; <span className="text-white ml-2">DASHBOARD</span>
          </div>
          <MemorySpaceSelector />
        </div>

        {/* Dashboard Title & Stats Grid */}
        <div className="grid grid-cols-3 gap-8 pb-10 border-b border-[#222]">
          <div className="col-span-1 border-r border-[#222] pr-8 flex flex-col justify-between">
            <h1 className="text-5xl text-white font-bold tracking-widest mb-12" style={{ fontFamily: 'monospace' }}>
              DASHBOARD
            </h1>
            <div className="space-y-4">
              <div className="flex justify-between text-xs uppercase border-b border-[#222] pb-2">
                <span className="text-slate-500">Active Rules</span>
                <span className="text-white">{approvedCount}</span>
              </div>
              <div className="flex justify-between text-xs uppercase border-b border-[#222] pb-2">
                <span className="text-slate-500">Pending</span>
                <span className="text-red-500">{pendingCount}</span>
              </div>
            </div>
          </div>

          <div className="col-span-1 border-r border-[#222] px-8 flex flex-col justify-between relative">
            <div className="text-xs uppercase text-slate-500 flex items-center justify-between">
              <span>System Status</span>
              {mcpHealth && (
                <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 border ${
                  mcpHealth.status === 'ONLINE' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                  mcpHealth.status === 'DEGRADED' ? 'bg-amber-950/80 text-amber-400 border-amber-500/40' :
                  'bg-red-950/80 text-red-400 border-red-500/40'
                }`}>
                  MCP: {mcpHealth.status} ({mcpHealth.latencyMs}ms)
                </span>
              )}
            </div>
            <div className="text-7xl font-bold text-white tracking-tighter" style={{ fontFamily: 'monospace' }}>
              V-1<span className="text-red-600 text-3xl align-top ml-1">*</span>
            </div>
            <div className="text-xs uppercase text-slate-500 mt-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mcpHealth?.status === 'OFFLINE' ? 'bg-red-600 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span>Collective Memory System {mcpHealth?.status === 'OFFLINE' ? 'Degraded' : 'Online'}.</span>
            </div>
          </div>

          <div className="col-span-1 pl-8 flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase text-slate-500 mb-2 flex items-center justify-between">
                <span>Tokens Saved (Est)</span>
                {autoRefresh && <span className="text-[9px] text-red-500 font-bold tracking-widest animate-pulse">LIVE</span>}
              </div>
              <div className="text-4xl text-emerald-400 border-b border-[#222] pb-4 flex items-center justify-between font-bold" style={{ fontFamily: 'monospace' }}>
                <span>{formatTokens((contexts.reduce((acc, c) => acc + Number(c.retrieval_count), 0)) * contexts.length * 250)} <span className="text-sm text-slate-500">TOKENS</span></span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-4 h-4 rounded-full border border-red-600 transition-all cursor-pointer relative group ${
                    autoRefresh 
                      ? 'bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.9)] animate-pulse' 
                      : 'bg-red-600/20 hover:bg-red-600/60'
                  }`}
                  aria-label="Toggle Live Auto-Refresh"
                >
                  <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 hidden group-hover:block whitespace-nowrap bg-black border border-[#333] text-slate-200 text-[10px] px-2.5 py-1 rounded shadow-xl z-50 normal-case font-sans tracking-normal">
                    {autoRefresh ? "Auto-refresh ACTIVE (polling 2.5s). Click to disable." : "Click to enable live auto-refresh polling"}
                  </span>
                </button>
              </div>
            </div>
            <div className="mt-8">
              <div className="text-xs uppercase text-slate-500 mb-2 flex items-center justify-between">
                <span>Retrieval Volume</span>
                {autoRefresh && <span className="text-[9px] text-red-500 font-bold tracking-widest animate-pulse">LIVE</span>}
              </div>
              <div className="text-4xl text-white flex items-center justify-between">
                <span>{contexts.reduce((acc, c) => acc + Number(c.retrieval_count), 0)} <span className="text-sm text-slate-500">/HITS</span></span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-4 h-4 rounded-full border border-red-600 transition-all cursor-pointer relative group ${
                    autoRefresh 
                      ? 'bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.9)] animate-pulse' 
                      : 'bg-red-600/20 hover:bg-red-600/60'
                  }`}
                  aria-label="Toggle Live Auto-Refresh"
                >
                  <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 hidden group-hover:block whitespace-nowrap bg-black border border-[#333] text-slate-200 text-[10px] px-2.5 py-1 rounded shadow-xl z-50 normal-case font-sans tracking-normal">
                    {autoRefresh ? "Auto-refresh ACTIVE (polling 2.5s). Click to disable." : "Click to enable live auto-refresh polling"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-red-500 uppercase tracking-widest">Loading...</div>
        ) : (
          <div className="space-y-12">
            
            {/* Pending Approvals (Hidden when no pending review items exist) */}
            {pendingItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl text-white uppercase tracking-widest flex items-center gap-3">
                    Pending Reviews
                    <span className="bg-red-600/20 border border-red-600/40 text-red-400 text-xs px-2 py-0.5 font-bold">
                      {pendingItems.length}
                    </span>
                  </h2>
                  <span className="text-xs text-slate-500 uppercase">Page Limit: {PENDING_PAGE_SIZE}</span>
                </div>
                <div className="text-xs uppercase text-slate-500 grid grid-cols-12 pb-3 border-b border-[#222] font-bold">
                  <div onClick={() => handlePendingSort('context_type')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                    Type {renderSortIndicator(pendingSortField, 'context_type', pendingSortOrder)}
                  </div>
                  <div onClick={() => handlePendingSort('topic')} className="col-span-3 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                    Topic {renderSortIndicator(pendingSortField, 'topic', pendingSortOrder)}
                  </div>
                  <div onClick={() => handlePendingSort('created_at')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                    Date {renderSortIndicator(pendingSortField, 'created_at', pendingSortOrder)}
                  </div>
                  <div onClick={() => handlePendingSort('status')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                    Status {renderSortIndicator(pendingSortField, 'status', pendingSortOrder)}
                  </div>
                  <div onClick={() => handlePendingSort('author_role')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                    Author {renderSortIndicator(pendingSortField, 'author_role', pendingSortOrder)}
                  </div>
                  <div className="col-span-1 text-right select-none">Actions</div>
                </div>
                
                <div className="flex flex-col">
                  {paginatedPending.map((ctx) => (
                    <div key={ctx.id} onClick={() => setPendingModalOpen(ctx)} className="grid grid-cols-12 items-center text-xs uppercase py-4 border-b border-[#222] hover:bg-slate-900 cursor-pointer transition-colors group">
                      <div className="col-span-2 px-2 font-bold flex items-center">{renderContextType(ctx.context_type)}</div>
                      <div className="col-span-3 font-bold truncate pr-4 text-white group-hover:text-red-400">{ctx.topic}</div>
                      <div className="col-span-2">{new Date(ctx.created_at).toLocaleDateString()}</div>
                      <div className="col-span-2 flex items-center gap-2">
                        {ctx.metadata?.conflict_ids && ctx.metadata.conflict_ids.length > 0 ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConflictModalOpen(ctx); }}
                            className="bg-red-900 text-red-100 font-bold px-2 py-1 flex items-center gap-1 text-[10px] hover:bg-red-600 transition-colors"
                          >
                            CONFLICT ({ctx.metadata.conflict_ids.length})
                          </button>
                        ) : (
                          <span className="text-red-500 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-600"></div> IN PROGRESS
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 truncate">{ctx.author_role}</div>
                      <div className="col-span-1 flex justify-end gap-2 pr-2 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                         <button onClick={(e) => { e.stopPropagation(); updateStatus(ctx.id, 'rejected'); }} className="text-red-600 font-bold hover:underline">REJ</button>
                         <button onClick={(e) => { e.stopPropagation(); updateStatus(ctx.id, 'approved'); }} className="text-white font-bold hover:text-emerald-400 hover:underline">APP</button>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination(pendingPage, pendingItems.length, PENDING_PAGE_SIZE, setPendingPage)}
              </section>
            )}

            {/* Active & Disabled Ledger */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-white uppercase tracking-widest">Memory Management</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
                    <span className="text-slate-500">Filter Scope:</span>
                    <select
                      value={scopeFilter}
                      onChange={(e) => { setScopeFilter(e.target.value as any); setMemoryPage(1); }}
                      className="bg-[#141414] border border-[#333] text-white text-xs px-2 py-1 focus:outline-none focus:border-red-600 font-mono cursor-pointer"
                    >
                      <option value="all">ALL SCOPES</option>
                      <option value="global">GLOBAL ONLY</option>
                      <option value="project">PROJECT-SPECIFIC</option>
                    </select>
                  </div>
                  <span className="text-xs text-slate-500 uppercase border-l border-[#222] pl-4">Page Limit: {MEMORY_PAGE_SIZE}</span>
                </div>
              </div>
              <div className="text-xs uppercase text-slate-500 grid grid-cols-12 pb-3 border-b border-[#222] font-bold">
                <div onClick={() => handleMemorySort('status')} className="col-span-1 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                  Status {renderSortIndicator(memorySortField, 'status', memorySortOrder)}
                </div>
                <div onClick={() => handleMemorySort('context_type')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                  Type {renderSortIndicator(memorySortField, 'context_type', memorySortOrder)}
                </div>
                <div onClick={() => handleMemorySort('topic')} className="col-span-3 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                  Topic {renderSortIndicator(memorySortField, 'topic', memorySortOrder)}
                </div>
                <div onClick={() => handleMemorySort('content')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                  Rule Preview {renderSortIndicator(memorySortField, 'content', memorySortOrder)}
                </div>
                <div onClick={() => handleMemorySort('retrieval_count')} className="col-span-1 cursor-pointer hover:text-white transition-colors select-none flex items-center justify-center">
                  Hits {renderSortIndicator(memorySortField, 'retrieval_count', memorySortOrder)}
                </div>
                <div className="col-span-3 text-right select-none">Admin Actions</div>
              </div>
              
              <div className="flex flex-col">
                {paginatedMemory.map((ctx) => (
                  <div key={ctx.id} onClick={() => startEdit(ctx)} className="grid grid-cols-12 items-center text-[10px] md:text-xs uppercase py-4 border-b border-[#222] hover:bg-slate-900 cursor-pointer transition-colors group">
                    <div className="col-span-1 px-2">
                      <span className={['approved', 'auto_approved'].includes(ctx.status) ? (ctx.status === 'auto_approved' ? 'text-blue-500 font-bold' : 'text-emerald-500 font-bold') : 'text-slate-600 font-bold'}>
                        {ctx.status === 'auto_approved' ? 'AUTO' : (ctx.status === 'approved' ? 'ON' : 'OFF')}
                      </span>
                    </div>
                    <div className="col-span-2 font-bold px-2 flex items-center">{renderContextType(ctx.context_type)}</div>
                    <div className={`col-span-3 font-bold pr-4 truncate ${!['approved', 'auto_approved'].includes(ctx.status) ? 'text-slate-600' : 'text-white group-hover:text-red-400'}`}>
                      <div className="flex items-center gap-2">
                        <span>{ctx.topic}</span>
                        {renderScopeBadge(ctx.scope, ctx.project_name)}
                      </div>
                    </div>
                    <div className={`col-span-2 truncate pr-4 ${!['approved', 'auto_approved'].includes(ctx.status) ? 'text-slate-700' : 'text-slate-400'}`}>{ctx.content}</div>
                    <div className="col-span-1 text-center">
                       <span className={['approved', 'auto_approved'].includes(ctx.status) ? 'bg-red-600 text-white px-2 py-1' : 'bg-[#222] text-slate-500 px-2 py-1'}>
                         {ctx.retrieval_count}
                       </span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-5 pr-2 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                       
                       {/* Custom Blocky Toggle Switch */}
                       <button 
                         onClick={(e) => { e.stopPropagation(); toggleActiveStatus(ctx.id, ctx.status); }}
                         className={`w-12 h-6 border flex items-center p-[2px] transition-colors ${['approved', 'auto_approved'].includes(ctx.status) ? 'border-red-600 bg-red-600/10' : 'border-[#444] bg-[#111]'}`}
                         title={['approved', 'auto_approved'].includes(ctx.status) ? 'Disable Memory' : 'Enable Memory'}
                       >
                         <div className={`w-4 h-4 transition-transform ${['approved', 'auto_approved'].includes(ctx.status) ? 'bg-red-600 translate-x-6' : 'bg-[#555] translate-x-0'}`}></div>
                       </button>

                       {/* Delete Text */}
                       <button 
                         onClick={(e) => { e.stopPropagation(); confirmDelete(ctx.id); }} 
                         className="text-red-600 font-bold hover:text-red-400 transition-colors"
                         title="Delete Memory"
                       >
                         DEL
                       </button>
                    </div>
                  </div>
                ))}
                {memoryItems.length === 0 && (
                  <div className="py-8 text-center text-slate-600 uppercase tracking-widest border-b border-[#222]">
                    No active or disabled memories found.
                  </div>
                )}
              </div>
              {renderPagination(memoryPage, memoryItems.length, MEMORY_PAGE_SIZE, setMemoryPage)}
            </section>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#333] max-w-lg w-full p-8 shadow-2xl relative">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
             
             <h3 className="text-white text-xl uppercase tracking-widest mb-6 border-b border-[#222] pb-4">
               Edit Memory
             </h3>
             <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-2 uppercase tracking-widest">Topic</label>
                  <input 
                    className="w-full bg-black border border-[#444] text-white p-3 focus:outline-none focus:border-red-600 transition-colors" 
                    value={editTopic} 
                    onChange={(e) => setEditTopic(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-2 uppercase tracking-widest">Content</label>
                  <textarea 
                    className="w-full bg-black border border-[#444] text-white p-3 h-28 focus:outline-none focus:border-red-600 transition-colors font-mono text-xs" 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)} 
                  />
                </div>

                <div className="border-t border-[#222] pt-4 mt-4 space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-2 uppercase tracking-widest font-bold">Memory Isolation Scope</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs uppercase text-slate-300">
                        <input 
                          type="radio" 
                          name="editScope" 
                          value="global" 
                          checked={editScope === 'global'} 
                          onChange={() => setEditScope('global')}
                          className="accent-red-600"
                        />
                        <span>Global (Org-Wide)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs uppercase text-slate-300">
                        <input 
                          type="radio" 
                          name="editScope" 
                          value="project" 
                          checked={editScope === 'project'} 
                          onChange={() => setEditScope('project')}
                          className="accent-red-600"
                        />
                        <span>Project-Specific</span>
                      </label>
                    </div>
                  </div>

                  {editScope === 'project' && (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1 uppercase tracking-widest">Target Project Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-black border border-[#444] text-white p-2.5 focus:outline-none focus:border-red-600 transition-colors text-xs font-mono" 
                        placeholder="e.g. HiveContext-Server"
                        value={editProjectName} 
                        onChange={(e) => setEditProjectName(e.target.value)} 
                      />
                    </div>
                  )}
                </div>
             </div>
             <div className="mt-8 flex gap-4">
                <button onClick={executeEdit} className="flex-1 bg-white text-black font-bold py-3 hover:bg-emerald-500 hover:text-white transition-colors tracking-widest uppercase">
                  Save Changes
                </button>
                <button onClick={() => setEditingId(null)} className="flex-1 bg-[#222] text-white font-bold py-3 hover:bg-[#333] transition-colors tracking-widest uppercase border border-[#444]">
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-red-900 max-w-md w-full p-8 shadow-2xl relative">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
             
             <h3 className="text-red-500 text-xl font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               Confirm Deletion
             </h3>
             <p className="text-sm text-slate-400 mb-8 leading-relaxed">
               This memory will be moved to the <strong className="text-white">Recycle Bin</strong> for a period of <strong className="text-white">30 days</strong> before being completely purged from the system. You can restore it anytime during this period.
             </p>
             <div className="flex gap-4">
                <button onClick={executeDelete} className="flex-1 bg-red-600 text-white font-bold py-3 hover:bg-red-500 transition-colors tracking-widest uppercase shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                  Delete
                </button>
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-[#222] text-slate-300 font-bold py-3 hover:bg-[#333] transition-colors tracking-widest uppercase border border-[#444]">
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {conflictModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-red-900 w-full max-w-5xl h-[80vh] shadow-2xl relative flex flex-col">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
             
             <div className="p-6 border-b border-[#222] flex justify-between items-center bg-[#111]">
               <h3 className="text-red-500 text-xl font-bold uppercase tracking-widest flex items-center gap-2">
                 <div className="w-3 h-3 bg-red-600 animate-pulse"></div>
                 Conflict Resolution Center
               </h3>
               <button onClick={() => setConflictModalOpen(null)} className="text-slate-500 hover:text-white">✕</button>
             </div>
             
             <div className="flex-1 overflow-hidden flex">
               {/* Left Side: Proposed Rule */}
               <div className="w-1/2 border-r border-[#222] p-8 overflow-y-auto">
                 <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">Proposed Memory (Pending)</div>
                 <div className="mb-4">{renderContextType(conflictModalOpen.context_type)}</div>
                 <h2 className="text-2xl font-bold text-white mb-4">{conflictModalOpen.topic}</h2>
                 <p className="text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{conflictModalOpen.content}</p>
                 
                 <div className="mt-12 flex gap-4">
                    <button onClick={() => { updateStatus(conflictModalOpen.id, 'approved'); setConflictModalOpen(null); }} className="flex-1 bg-emerald-600 text-white font-bold py-4 hover:bg-emerald-500 transition-colors tracking-widest uppercase">
                      Force Approve
                    </button>
                    <button onClick={() => { updateStatus(conflictModalOpen.id, 'rejected'); setConflictModalOpen(null); }} className="flex-1 bg-red-600 text-white font-bold py-4 hover:bg-red-500 transition-colors tracking-widest uppercase">
                      Reject Rule
                    </button>
                 </div>
               </div>
               
               {/* Right Side: Conflicting Existing Rules */}
               <div className="w-1/2 p-8 bg-[#0d0d0d] overflow-y-auto">
                 <div className="text-xs text-red-500 uppercase tracking-widest mb-6 border-b border-red-900/30 pb-2">
                   Detected Semantic Conflicts ({conflictModalOpen.metadata?.conflict_ids?.length})
                 </div>
                 
                 <div className="space-y-6">
                   {conflictModalOpen.metadata?.conflict_ids?.map((id) => {
                     const existing = contexts.find(c => c.id === id);
                     if (!existing) return null;
                     return (
                       <div key={existing.id} className="border border-[#222] bg-[#111] p-6 hover:border-red-900/50 transition-colors">
                         <div className="flex justify-between items-start mb-4">
                           {renderContextType(existing.context_type)}
                           <span className="text-[10px] text-emerald-500 bg-emerald-900/20 px-2 py-1">ACTIVE</span>
                         </div>
                         <h4 className="text-lg font-bold text-white mb-2">{existing.topic}</h4>
                         <p className="text-sm text-slate-400 font-mono line-clamp-3 whitespace-pre-wrap">{existing.content}</p>
                       </div>
                     )
                   })}
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Read-Only Pending Review Detail Modal */}
      {pendingModalOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#333] max-w-2xl w-full p-8 shadow-2xl relative">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
             
             <div className="flex justify-between items-start border-b border-[#222] pb-4 mb-6">
               <div>
                 <div className="flex items-center gap-3 mb-2">
                   {renderContextType(pendingModalOpen.context_type)}
                   {renderScopeBadge(pendingModalOpen.scope, pendingModalOpen.project_name)}
                 </div>
                 <h3 className="text-white text-2xl font-bold tracking-widest">
                   {pendingModalOpen.topic}
                 </h3>
               </div>
               <button 
                 onClick={() => setPendingModalOpen(null)} 
                 className="text-slate-500 hover:text-white p-1 text-lg font-bold"
               >
                 ✕
               </button>
             </div>

             <div className="space-y-5">
               <div>
                 <label className="text-[10px] text-slate-500 block mb-2 uppercase tracking-widest font-bold">Rule Content (Read-Only)</label>
                 <div className="w-full bg-black border border-[#222] text-slate-200 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                   {pendingModalOpen.content}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 border-t border-[#222] pt-4 text-xs uppercase">
                 <div>
                   <span className="text-slate-500 block text-[10px]">Author Role:</span>
                   <span className="text-white font-bold">{pendingModalOpen.author_role}</span>
                 </div>
                 <div>
                   <span className="text-slate-500 block text-[10px]">Created Date:</span>
                   <span className="text-white font-bold">{new Date(pendingModalOpen.created_at).toLocaleString()}</span>
                 </div>
               </div>
             </div>

             <div className="mt-8 flex gap-4 border-t border-[#222] pt-6">
               <button 
                 onClick={() => { updateStatus(pendingModalOpen.id, 'approved'); setPendingModalOpen(null); }} 
                 className="flex-1 bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-500 transition-colors tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.3)]"
               >
                 Approve Memory
               </button>
               <button 
                 onClick={() => { updateStatus(pendingModalOpen.id, 'rejected'); setPendingModalOpen(null); }} 
                 className="flex-1 bg-red-600 text-white font-bold py-3 hover:bg-red-500 transition-colors tracking-widest uppercase shadow-[0_0_15px_rgba(220,38,38,0.3)]"
               >
                 Reject Memory
               </button>
               <button 
                 onClick={() => setPendingModalOpen(null)} 
                 className="px-6 bg-[#1a1a1a] text-slate-400 font-bold py-3 hover:bg-[#252525] hover:text-white transition-colors tracking-widest uppercase border border-[#333]"
               >
                 Close
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
