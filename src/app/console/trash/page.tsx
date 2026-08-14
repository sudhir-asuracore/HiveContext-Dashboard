'use client';
import { useEffect, useState } from 'react';
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
  created_at: string;
  deleted_at?: string;
};

export default function Trash() {
  const [contexts, setContexts] = useState<HiveContext[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeSpace } = useMemorySpace();

  const deletedItems = contexts.filter(c => {
    if (c.status !== 'deleted') return false;
    return true;
  });

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
  }, [activeSpace]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-mono flex">
      <Sidebar />

      <div className="flex-1 p-10 max-w-7xl mx-auto space-y-12">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div className="flex items-center text-[10px] tracking-widest uppercase text-slate-500">
            CONSOLE &gt; <span className="text-white ml-2">DELETE STAGE (TRASH)</span>
          </div>
          <MemorySpaceSelector />
        </div>

        {/* Dashboard Title & Stats Grid */}
        <div className="grid grid-cols-3 gap-8 pb-10 border-b border-[#222]">
          <div className="col-span-1 border-r border-[#222] pr-8 flex flex-col justify-between">
            <h1 className="text-5xl text-white font-bold tracking-widest mb-12" style={{ fontFamily: 'monospace' }}>
              RECYCLE BIN
            </h1>
            <div className="space-y-4">
              <div className="flex justify-between text-xs uppercase border-b border-[#222] pb-2">
                <span className="text-slate-500">Deleted Memories</span>
                <span className="text-red-500">{deletedItems.length}</span>
              </div>
            </div>
          </div>

          <div className="col-span-1 border-r border-[#222] px-8 flex flex-col justify-between relative">
            <div className="text-xs uppercase text-slate-500">Auto-Purge System</div>
            <div className="text-7xl font-bold text-white tracking-tighter" style={{ fontFamily: 'monospace' }}>
              30<span className="text-red-600 text-3xl align-top ml-1">d</span>
            </div>
            <div className="text-xs uppercase text-slate-500 mt-4">
              Memories are permanently deleted after 30 days.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-red-500 uppercase tracking-widest mt-8">Loading Delete Stage...</div>
        ) : (
          <div className="space-y-12">
            
            {/* Delete Stage Panel */}
            <section>
              <h2 className="text-xl text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="text-red-500">⚠</span> Delete Stage (Memories)
              </h2>
              <div className="text-xs uppercase text-slate-500 grid grid-cols-12 pb-3 border-b border-[#222]">
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Topic</div>
                <div className="col-span-4">Rule Preview</div>
                <div className="col-span-1 text-center">Expires</div>
                <div className="col-span-3 text-right">Admin Actions</div>
              </div>
              
              <div className="flex flex-col">
                {deletedItems.map((ctx) => {
                  const deletedDate = ctx.deleted_at ? new Date(ctx.deleted_at) : new Date();
                  const expireDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                  const daysLeft = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  
                  return (
                    <div key={ctx.id} className="grid grid-cols-12 items-center text-[10px] md:text-xs uppercase py-4 border-b border-[#222] hover:bg-slate-900 transition-colors group">
                      <div className="col-span-1 px-2 text-red-600 font-bold">[DEL]</div>
                      <div className="col-span-3 font-bold pr-4 truncate text-slate-600 line-through">{ctx.topic}</div>
                      <div className="col-span-4 truncate pr-4 text-slate-700 line-through">{ctx.content}</div>
                      <div className="col-span-1 text-center text-amber-500 font-bold">
                         {daysLeft}d
                      </div>
                      <div className="col-span-3 flex justify-end gap-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => updateStatus(ctx.id, 'approved')} 
                           className="text-white font-bold bg-[#222] px-3 py-1 hover:bg-white hover:text-black transition-colors border border-[#444]"
                         >
                           RESTORE
                         </button>
                      </div>
                    </div>
                  );
                })}
                {deletedItems.length === 0 && (
                  <div className="py-8 text-center text-slate-600 uppercase tracking-widest border-b border-[#222]">
                    Recycle bin is empty.
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
