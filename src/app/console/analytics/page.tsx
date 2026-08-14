'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MemorySpaceSelector from '@/components/MemorySpaceSelector';
import { useMemorySpace } from '@/context/MemorySpaceContext';

type AnalyticsData = {
  totalRules: number;
  statusBreakdown: { approved?: number; pending?: number; rejected?: number };
  totalRetrievals: number;
  topRetrieved: { topic: string; retrieval_count: number; author_role: string }[];
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { activeSpace } = useMemorySpace();

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<'topic' | 'author_role' | 'retrieval_count'>('retrieval_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'retrieval_count' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const renderSortIndicator = (targetField: string) => {
    if (sortField !== targetField) return <span className="text-slate-700 ml-1 text-[10px]">↕</span>;
    return <span className="text-red-500 ml-1 text-[10px] font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  const formatTokens = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(3).replace(/\.?0+$/, '') + 'B';
    if (num >= 1000) return (num / 1000000).toFixed(3).replace(/\.?0+$/, '') + 'M';
    return num.toString();
  };

  const fetchAnalytics = () => {
    const url = activeSpace.type !== 'ALL' ? `/api/analytics?space=${encodeURIComponent(activeSpace.dbName)}` : '/api/analytics';
    fetch(url)
      .then(res => res.json())
      .then(d => {
        if (d.error || !d.statusBreakdown) {
          setData({
            totalRules: 0,
            statusBreakdown: {},
            totalRetrievals: 0,
            topRetrieved: []
          });
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeSpace.dbName]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-mono flex">
      <Sidebar />

      <div className="flex-1 p-10 max-w-7xl mx-auto space-y-12">
        {/* Top Header Row with Global Memory Space Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div className="flex items-center text-[10px] tracking-widest uppercase text-slate-500">
            CONSOLE &gt; <span className="text-white ml-2">ANALYTICS</span>
          </div>
          <MemorySpaceSelector />
        </div>

        {loading || !data ? (
          <div className="text-red-500 uppercase tracking-widest mt-8">Loading Analytics...</div>
        ) : (
          <div className="space-y-12">
            {/* Dashboard Title & Stats Grid */}
            <div className="grid grid-cols-3 gap-8 pb-10 border-b border-[#222]">
              <div className="col-span-1 border-r border-[#222] pr-8 flex flex-col justify-between">
                <h1 className="text-5xl text-white font-bold tracking-widest mb-12" style={{ fontFamily: 'monospace' }}>
                  ANALYTICS
                </h1>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs uppercase border-b border-[#222] pb-2">
                    <span className="text-slate-500">Approved Rules</span>
                    <span className="text-white">{data.statusBreakdown.approved || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs uppercase border-b border-[#222] pb-2">
                    <span className="text-slate-500">Pending Approvals</span>
                    <span className="text-red-500">{data.statusBreakdown.pending || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs uppercase border-b border-[#222] pb-2">
                    <span className="text-slate-500">Total Rules</span>
                    <span className="text-white">{data.totalRules || 0}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-1 border-r border-[#222] px-8 flex flex-col justify-between relative">
                 <div className="text-xs uppercase text-slate-500 mb-2 flex items-center justify-between">
                   <span>Total Retrievals (RAG HITS)</span>
                   {autoRefresh && <span className="text-[9px] text-red-500 font-bold tracking-widest animate-pulse">LIVE</span>}
                 </div>
                 <div className="text-7xl font-bold text-white tracking-tighter flex items-center justify-between" style={{ fontFamily: 'monospace' }}>
                    <span>{data.totalRetrievals}<span className="text-red-600 text-3xl align-top ml-1">*</span></span>
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
                 <div className="text-xs uppercase text-slate-500 mt-4">
                    Times agents successfully queried memory.
                 </div>
              </div>
              
              <div className="col-span-1 pl-8 flex flex-col justify-between">
                <div>
                  <div className="text-xs uppercase text-slate-500 mb-2 flex items-center justify-between">
                    <span>Tokens Saved (Est)</span>
                    {autoRefresh && <span className="text-[9px] text-red-500 font-bold tracking-widest animate-pulse">LIVE</span>}
                  </div>
                  <div className="text-4xl text-emerald-400 border-b border-[#222] pb-4 flex items-center justify-between font-bold" style={{ fontFamily: 'monospace' }}>
                    <span>{formatTokens(data.totalRetrievals * data.totalRules * 250)} <span className="text-sm text-slate-500">TOKENS</span></span>
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
                  <div className="text-[10px] uppercase text-slate-500 mt-4 leading-relaxed">
                    Estimated tokens saved by injecting targeted memory instead of passing all {data.totalRules} rules into the system prompt.
                  </div>
                </div>
              </div>
            </div>

            {/* Most Valuable Memory */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-white uppercase tracking-widest">Most Valuable Memory (Top Hits)</h2>
                <span className="text-xs text-slate-500 uppercase">Page Limit: {PAGE_SIZE}</span>
              </div>
              <div className="text-xs uppercase text-slate-500 grid grid-cols-12 pb-3 border-b border-[#222] font-bold">
                <div className="col-span-1 select-none">Rank</div>
                <div onClick={() => handleSort('topic')} className="col-span-6 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                  Topic {renderSortIndicator('topic')}
                </div>
                <div onClick={() => handleSort('author_role')} className="col-span-3 cursor-pointer hover:text-white transition-colors select-none flex items-center">
                  Author Role {renderSortIndicator('author_role')}
                </div>
                <div onClick={() => handleSort('retrieval_count')} className="col-span-2 cursor-pointer hover:text-white transition-colors select-none flex items-center justify-end pr-2">
                  Retrievals {renderSortIndicator('retrieval_count')}
                </div>
              </div>
              
              <div className="flex flex-col">
                {(() => {
                  const sorted = (data.topRetrieved || []).slice().sort((a, b) => {
                    let valA: any = a[sortField] || '';
                    let valB: any = b[sortField] || '';
                    if (sortField === 'retrieval_count') {
                      valA = Number(a.retrieval_count || 0);
                      valB = Number(b.retrieval_count || 0);
                    }
                    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                    return 0;
                  });

                  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

                  return (
                    <>
                      {paginated.map((item, idx) => {
                        const originalRank = sorted.findIndex(x => x.topic === item.topic && x.retrieval_count === item.retrieval_count) + 1;
                        return (
                          <div key={idx} className="grid grid-cols-12 items-center text-xs uppercase py-4 border-b border-[#222] hover:bg-white hover:text-black transition-colors">
                            <div className="col-span-1 px-2 font-bold text-red-500">#{originalRank}</div>
                            <div className="col-span-6 font-bold truncate pr-4">{item.topic}</div>
                            <div className="col-span-3">{item.author_role}</div>
                            <div className="col-span-2 text-right pr-2">
                               <span className="bg-red-600 text-white px-2 py-1 font-bold">{item.retrieval_count}</span>
                            </div>
                          </div>
                        );
                      })}

                      {sorted.length === 0 && (
                         <div className="py-8 text-center text-slate-600 uppercase tracking-widest border-b border-[#222]">
                            No data available yet.
                         </div>
                      )}

                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-2 text-xs uppercase text-slate-500 border-t border-[#222] gap-4">
                          <div>
                            Showing <span className="text-white font-bold">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)}</span> of <span className="text-white font-bold">{sorted.length}</span> items
                          </div>
                          <div className="flex items-center gap-2 font-bold">
                            <button
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                              className="px-3 py-1 bg-[#111] border border-[#222] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors uppercase text-[10px]"
                            >
                              &lt; PREV
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                              <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`px-3 py-1 text-[10px] border transition-colors ${
                                  page === p
                                    ? 'bg-red-600 border-red-500 text-white font-bold shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                                    : 'bg-[#111] border-[#222] text-slate-400 hover:text-white'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                            <button
                              onClick={() => setPage(page + 1)}
                              disabled={page === totalPages}
                              className="px-3 py-1 bg-[#111] border border-[#222] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors uppercase text-[10px]"
                            >
                              NEXT &gt;
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
