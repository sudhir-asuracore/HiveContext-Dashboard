'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MemorySpaceSelector from '@/components/MemorySpaceSelector';
import HealthTab from '@/components/HealthTab';
import { useMemorySpace } from '@/context/MemorySpaceContext';

type ActionModalConfig = {
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
};

export default function Admin() {
  const { activeSpace, refreshSpaces } = useMemorySpace();
  const [activeTab, setActiveTab] = useState<'general' | 'health'>('general');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dedupThreshold, setDedupThreshold] = useState(0.1);
  const [allowAutoApprove, setAllowAutoApprove] = useState(true);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(9);
  const [savingSettings, setSavingSettings] = useState(false);

  // Control Plane State & Modals
  const [ccloudInfo, setCcloudInfo] = useState<any>(null);
  const [provisioningDb, setProvisioningDb] = useState(false);
  const [provisionResult, setProvisionResult] = useState<any>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModalConfig | null>(null);

  // Per-Space MCP Config Modal State
  const [mcpModalSpace, setMcpModalSpace] = useState<any | null>(null);
  const [mcpClientType, setMcpClientType] = useState<'antigravity' | 'cursor' | 'stdio'>('antigravity');
  const [mcpCopied, setMcpCopied] = useState(false);

  const [newSpaceName, setNewSpaceName] = useState('');
  const [primaryRegion, setPrimaryRegion] = useState('ap-south-1');
  const [secondaryRegions, setSecondaryRegions] = useState<string[]>(['us-east-1']);

  const availableRegions = [
    { code: 'ap-south-1', label: 'Asia Pacific (Mumbai / ap-south-1)' },
    { code: 'us-east-1', label: 'US East (N. Virginia / us-east-1)' },
    { code: 'eu-west-1', label: 'Europe (Ireland / eu-west-1)' }
  ];

  const fetchCcloudData = async () => {
    try {
      const res = await fetch('/api/ccloud');
      const data = await res.json();
      if (data && data.success) {
        setCcloudInfo(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data && !data.error) {
        setDedupThreshold(data.dedup_threshold ?? 0.1);
        setAllowAutoApprove(data.allow_auto_approve ?? true);
        setAutoApproveThreshold(data.auto_approve_threshold ?? 9);
      }
    });
    fetchCcloudData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (ccloudInfo?.databases?.some((db: any) => db.status === 'PROVISIONING' || db.status === 'DELETING')) {
      interval = setInterval(fetchCcloudData, 2000);
    }
    return () => clearInterval(interval);
  }, [ccloudInfo]);

  const toggleSecondaryRegion = (regionCode: string) => {
    if (secondaryRegions.includes(regionCode)) {
      setSecondaryRegions(secondaryRegions.filter(r => r !== regionCode));
    } else {
      setSecondaryRegions([...secondaryRegions, regionCode]);
    }
  };

  const triggerProvision = async () => {
    if (!newSpaceName.trim()) {
      alert('Please enter a memory space name.');
      return;
    }

    setProvisioningDb(true);
    setProvisionResult(null);
    try {
      const res = await fetch('/api/ccloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_name: newSpaceName,
          primary_region: primaryRegion,
          secondary_regions: secondaryRegions,
          plan_tier: 'pro'
        })
      });
      const data = await res.json();
      setProvisionResult(data);
      setShowProvisionModal(false);
      setNewSpaceName('');
      fetchCcloudData();
      refreshSpaces();
    } catch (e) {
      alert('Failed to provision database space');
    }
    setProvisioningDb(false);
  };

  const handlePurgeShared = (tenantId: string) => {
    setActionModal({
      title: '⚠ CONFIRM SHARED SPACE PURGE',
      message: 'Are you sure you want to purge your tenant data from the Shared space cluster? This will delete ONLY your tenant memories.',
      confirmText: 'CONFIRM PURGE',
      variant: 'danger',
      onConfirm: async () => {
        setActionModal(null);
        setLoading(true);
        try {
          const res = await fetch('/api/ccloud/purge-shared', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: tenantId })
          });
          const data = await res.json();
          fetchCcloudData();
          refreshSpaces();
        } catch (e) {
          alert('Purge failed');
        }
        setLoading(false);
      }
    });
  };

  const handlePurgeDedicatedSpace = (dbName: string) => {
    setActionModal({
      title: '⚠ CONFIRM PURGE DEDICATED SPACE',
      message: `Are you sure you want to PURGE ALL DATA inside dedicated space '${dbName}'? All memories in this space will be cleared.`,
      confirmText: 'PURGE ALL MEMORIES',
      variant: 'warning',
      onConfirm: async () => {
        setActionModal(null);
        setLoading(true);
        try {
          const res = await fetch('/api/ccloud/purge-space', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database_name: dbName })
          });
          const data = await res.json();
          fetchCcloudData();
          refreshSpaces();
        } catch (e) {
          alert('Purge failed');
        }
        setLoading(false);
      }
    });
  };

  const handleDeleteDedicatedSpace = (spaceId: string, dbName: string) => {
    setActionModal({
      title: '⚠ CONFIRM DELETE DATABASE SPACE',
      message: `Are you sure you want to DELETE database space '${dbName}' from CockroachDB? All memories and data in this space will be permanently destroyed!`,
      confirmText: 'DELETE DATABASE SPACE',
      variant: 'danger',
      onConfirm: async () => {
        setActionModal(null);
        setLoading(true);
        try {
          const res = await fetch('/api/ccloud/delete-space', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ space_id: spaceId, database_name: dbName })
          });
          const data = await res.json();
          fetchCcloudData();
          refreshSpaces();
        } catch (e) {
          alert('Delete space failed');
        }
        setLoading(false);
      }
    });
  };

  const executeReset = async () => {
    setLoading(true);
    try {
      if (activeSpace.type === 'SHARED') {
        await fetch('/api/ccloud/purge-shared', { method: 'POST' });
      } else {
        await fetch('/api/system/reset', { method: 'POST' });
      }
      setResetConfirm(false);
      window.location.href = '/console/dashboard';
    } catch (e) {
      alert('Failed to reset system');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const spaceParam = activeSpace.type === 'ALL' ? 'all' : activeSpace.dbName;
      const res = await fetch(`/api/system/export?space=${encodeURIComponent(spaceParam)}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hivecontext-export-${spaceParam}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (e) {
      alert('Export failed');
    }
    setLoading(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      const spaceParam = activeSpace.type === 'ALL' ? 'all' : activeSpace.dbName;
      const res = await fetch(`/api/system/import?space=${encodeURIComponent(spaceParam)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });
      
      if (res.ok) {
        alert(`Rules successfully imported into space: ${activeSpace.name}!`);
      } else {
        alert('Failed to import rules: Invalid format');
      }
    } catch (error) {
      alert('Error parsing JSON file');
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-mono flex relative">
      {loading && (
        <div className="fixed top-0 left-0 w-full h-[3px] bg-red-950/50 z-50 overflow-hidden">
          <div className="h-full bg-red-500 w-1/2 animate-shimmer" />
        </div>
      )}
      <Sidebar />

      <div className="flex-1 p-10 max-w-5xl mx-auto space-y-12">
        {/* Top Header Row with Global Memory Space Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div className="flex items-center text-[10px] tracking-widest uppercase text-slate-500">
            CONSOLE &gt; <span className="text-white ml-2">SYSTEM ADMINISTRATION</span>
          </div>
          <MemorySpaceSelector />
        </div>

        <h1 className="text-5xl text-white font-bold tracking-widest mb-12" style={{ fontFamily: 'monospace' }}>
          SETTINGS
        </h1>

        <nav className="flex border-b border-[#333]" aria-label="Settings sections">
          {(['general', 'health'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${activeTab === tab ? 'border-white bg-[#151515] text-white' : 'border-transparent text-slate-500 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === 'health' && <HealthTab />}

        {activeTab === 'general' && (
          <div className="space-y-10">
            {/* Data Management */}
            <section className="border border-[#222] p-8 relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-500"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-500"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-500"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-500"></div>
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-white uppercase tracking-widest">Data Management</h2>
                <span className="text-xs text-slate-300 font-bold">Scope: {activeSpace.name}</span>
              </div>
              <p className="text-sm text-slate-500 mb-8">
                Backup organizational rules to a JSON artifact, or import an existing collective brain vector database into <strong className="text-white">{activeSpace.name}</strong>.
              </p>
              
              <div className="flex gap-4">
                <button onClick={handleExport} className="flex-1 bg-[#111] hover:bg-white hover:text-black text-white font-bold py-3 transition-colors tracking-widest uppercase border border-[#333]">
                  Export Rules (JSON)
                </button>
                
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[#111] hover:bg-white hover:text-black text-white font-bold py-3 transition-colors tracking-widest uppercase border border-[#333]">
                  Import Rules
                </button>
              </div>
            </section>

            {/* Agent Memory Configuration */}
            <section className="border border-[#222] p-8 relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-500"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-500"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-500"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-500"></div>
              
              <h2 className="text-xl text-white uppercase tracking-widest mb-4">Agent Memory Configuration</h2>
              <p className="text-sm text-slate-500 mb-8">Configure deduplication and auto-approval thresholds for agent MCP requests.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Semantic Deduplication / Conflict Threshold</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      max="1" 
                      value={dedupThreshold} 
                      onChange={e => setDedupThreshold(parseFloat(e.target.value))} 
                      className="bg-[#111] border border-[#333] text-white p-3 w-32 focus:border-emerald-500 focus:outline-none" 
                    />
                    <span className="text-xs text-slate-500">Lower values require higher semantic similarity (cosine distance). Default: 0.1</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Allow Auto-Approve</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={allowAutoApprove} 
                      onChange={e => setAllowAutoApprove(e.target.checked)} 
                      className="w-5 h-5 accent-emerald-500" 
                    />
                    <span className="text-sm text-slate-300">
                      Allow agents to bypass manual human review for high-confidence memories.
                    </span>
                  </label>
                </div>

                {allowAutoApprove && (
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">Auto-Approve Confidence Threshold</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={autoApproveThreshold} 
                        onChange={e => setAutoApproveThreshold(parseInt(e.target.value))} 
                        className="bg-[#111] border border-[#333] text-white p-3 w-32 focus:border-emerald-500 focus:outline-none" 
                      />
                      <span className="text-xs text-slate-500">Minimum agent confidence score (1-10) to trigger auto-approval. Default: 9</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* CockroachDB Multi-Region Control Plane (Monochrome White Theme) */}
            <section className="border border-[#222] p-8 relative bg-[#0a0a0a]">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-500"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-500"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-500"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-500"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#222] mb-8 gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Multi-Region Memory Space Provisioning</span>
                  <h2 className="text-2xl text-white font-bold uppercase tracking-wider mt-1 flex items-center gap-3">
                    Control Plane
                    <span className="text-[10px] bg-[#222] text-slate-300 border border-[#444] px-2 py-0.5 font-mono tracking-widest">
                      3-REGION CLUSTER
                    </span>
                  </h2>
                </div>
              </div>

              {/* Provision Result Output Banner */}
              {provisionResult && (
                <div className="relative bg-[#141414] border border-[#333] p-4 mb-6 text-xs font-mono pr-10">
                  <button 
                    onClick={() => setProvisionResult(null)} 
                    className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors cursor-pointer p-1"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                  <div className="text-white font-bold mb-1">✓ {provisionResult.message}</div>
                  <div className="text-slate-400 text-[11px]">
                    Database: <span className="text-white font-bold">{provisionResult.database?.databaseName}</span> | Primary: <span className="text-emerald-400 font-bold">{provisionResult.database?.primaryRegion}</span>
                  </div>
                </div>
              )}

              {/* Provisioned Database Memory Spaces Ledger Table */}
              <div className="mb-6">
                <div className="text-xs uppercase text-slate-400 font-bold mb-3 flex items-center justify-between">
                  <span>Existing Provisioned Database Memory Spaces</span>
                </div>
                <div className="border border-[#222] bg-[#0d0d0d] overflow-hidden text-xs font-mono">
                  <div className="grid grid-cols-12 bg-[#141414] text-slate-400 uppercase text-[10px] font-bold p-3 border-b border-[#222]">
                    <div className="col-span-4">Database / Memory Space</div>
                    <div className="col-span-3">Primary / Secondary Regions</div>
                    <div className="col-span-3">Service Account</div>
                    <div className="col-span-2 text-right">Space Actions</div>
                  </div>
                  <div className="divide-y divide-[#1e1e1e]">
                    {(ccloudInfo?.databases || [
                      {
                        id: 'db-default-001',
                        databaseName: 'hive_tenant_defaultdb',
                        tenantId: '00000000-0000-0000-0000-000000000001',
                        status: 'ACTIVE_SHARED',
                        serviceAccount: 'sa-hive-shared-reader',
                        primaryRegion: 'ap-south-1',
                        secondaryRegions: ['us-east-1', 'eu-west-1'],
                      }
                    ]).map((db: any) => {
                      const isProvisioning = db.status === 'PROVISIONING';
                      const isDeleting = db.status === 'DELETING';
                      return (
                        <div key={db.id} className={`relative overflow-hidden grid grid-cols-12 items-center p-3 transition-colors text-[11px] ${isProvisioning || isDeleting ? 'bg-[#0a0a0a] opacity-80' : 'hover:bg-[#181818]'}`}>
                          {(isProvisioning || isDeleting) && (
                            <div className={`absolute bottom-0 left-0 w-full h-[2px] ${isDeleting ? 'bg-red-950/30' : 'bg-amber-950/30'}`}>
                              <div className={`h-full w-1/2 ${isDeleting ? 'bg-red-500' : 'bg-amber-400'} animate-shimmer`} />
                            </div>
                          )}
                          <div className="col-span-4 font-bold text-white flex items-center gap-2">
                            {isProvisioning ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            ) : isDeleting ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${db.databaseName === 'hive_tenant_defaultdb' ? 'bg-slate-300' : 'bg-emerald-400'}`}></span>
                            )}
                            <span className={`truncate ${isDeleting ? 'line-through text-slate-500' : ''}`}>
                              {db.databaseName === 'hive_tenant_defaultdb' ? 'Shared space cluster' : db.databaseName}
                            </span>
                          </div>
                          
                          <div className="col-span-3 font-mono text-[10px] flex items-center gap-1.5 flex-wrap">
                            <span className={`${isProvisioning ? 'bg-amber-950/80 text-amber-400 border-amber-500/40' : isDeleting ? 'bg-red-950/80 text-red-500 border-red-500/40' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'} border px-1.5 py-0.5 rounded font-bold`}>
                              1º {db.primaryRegion || 'ap-south-1'}
                            </span>
                            {db.secondaryRegions && db.secondaryRegions.length > 0 && db.secondaryRegions.map((r: string) => (
                              <span key={r} className={`bg-[#1a1a1a] border border-[#333] px-1.5 py-0.5 rounded ${isDeleting ? 'text-slate-600' : 'text-slate-300'}`}>
                                2º {r}
                              </span>
                            ))}
                          </div>

                          <div className="col-span-3 text-slate-300 font-mono text-[10px] truncate">
                            {db.serviceAccount}
                          </div>

                          <div className="col-span-2 text-right font-bold flex items-center justify-end gap-1.5">
                            {isProvisioning || isDeleting ? (
                              <span className="text-[9px] text-slate-500 tracking-wider font-normal">LOCK</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setMcpModalSpace(db)}
                                  className="bg-[#222] hover:bg-white hover:text-black text-slate-200 border border-[#444] px-2 py-0.5 text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                                  title="Get agentic MCP client config JSON snippet for this space"
                                >
                                  MCP Config
                                </button>
                                {db.databaseName === 'hive_tenant_defaultdb' ? (
                                  <button
                                    onClick={() => handlePurgeShared(db.tenantId)}
                                    className="bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 px-2 py-0.5 text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                                    title="Purge only tenant-specific data from Shared space cluster"
                                  >
                                    Purge Data
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handlePurgeDedicatedSpace(db.databaseName)}
                                      className="bg-amber-950/60 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-800/50 px-2 py-0.5 text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                                      title="Purge all memories inside this dedicated space"
                                    >
                                      Purge Data
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDedicatedSpace(db.id, db.databaseName)}
                                      className="bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 px-2 py-0.5 text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                                      title="Drop database space permanently from CockroachDB cluster"
                                    >
                                      Delete Space
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Right Action Row with 'Provision New Space' Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowProvisionModal(true)}
                  className={`font-bold py-3 px-6 text-xs uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center gap-2 bg-white hover:bg-slate-200 text-black cursor-pointer`}
                >
                  <span>+ Provision New Space</span>
                </button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="border border-red-900/50 p-8 relative bg-red-950/10">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-red-500 uppercase tracking-widest">Danger Zone</h2>
                <span className="text-xs text-red-400 font-bold">Target Space: {activeSpace.name}</span>
              </div>
              <p className="text-sm text-slate-500 mb-8">
                Execute memory purge for <strong className="text-white">{activeSpace.name}</strong>. For the Shared space cluster, this clears only your tenant data without affecting other users.
              </p>
              
              <button 
                onClick={() => setResetConfirm(true)}
                disabled={loading}
                className="w-full bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white font-bold py-3 transition-colors tracking-widest uppercase border border-red-900 cursor-pointer"
              >
                Purge Active Memory Space ({activeSpace.name})
              </button>
            </section>
          </div>
        )}

        {/* Per-Space MCP Configuration Popup Modal */}
        {mcpModalSpace && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] border-2 border-[#444] max-w-xl w-full p-8 shadow-[0_0_60px_rgba(255,255,255,0.1)] relative font-mono space-y-6">
              <div className="flex items-center justify-between border-b border-[#222] pb-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Agentic MCP Setup</span>
                  <h3 className="text-white text-xl font-bold uppercase tracking-widest mt-1">
                    {mcpModalSpace.databaseName === 'hive_tenant_defaultdb' ? 'Shared space cluster' : mcpModalSpace.databaseName}
                  </h3>
                </div>
                <button 
                  onClick={() => setMcpModalSpace(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Copy and paste this JSON configuration into your AI Coding Assistant (<strong className="text-white">Antigravity</strong>, <strong className="text-white">Claude Desktop</strong>, <strong className="text-white">Cursor</strong>, or <strong className="text-white">Stdio CLI</strong>). All agent memories will route directly to <strong className="text-white">{mcpModalSpace.databaseName}</strong>.
              </p>

              {/* Tabs */}
              <div className="flex border-b border-[#222] gap-2 text-xs">
                <button
                  onClick={() => setMcpClientType('antigravity')}
                  className={`px-3 py-2 uppercase font-bold tracking-wider transition-colors border-b-2 cursor-pointer ${
                    mcpClientType === 'antigravity' ? 'border-white text-white bg-[#1a1a1a]' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Antigravity / Claude (~/.mcp.json)
                </button>
                <button
                  onClick={() => setMcpClientType('cursor')}
                  className={`px-3 py-2 uppercase font-bold tracking-wider transition-colors border-b-2 cursor-pointer ${
                    mcpClientType === 'cursor' ? 'border-white text-white bg-[#1a1a1a]' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Cursor / VS Code (.vscode/mcp.json)
                </button>
                <button
                  onClick={() => setMcpClientType('stdio')}
                  className={`px-3 py-2 uppercase font-bold tracking-wider transition-colors border-b-2 cursor-pointer ${
                    mcpClientType === 'stdio' ? 'border-white text-white bg-[#1a1a1a]' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Stdio CLI
                </button>
              </div>

              {/* JSON Code Viewer */}
              <div className="bg-[#050505] border border-[#222] relative">
                <div className="flex items-center justify-between p-3 bg-[#141414] border-b border-[#222] text-[10px] text-slate-400 uppercase font-bold">
                  <span>{mcpClientType === 'antigravity' ? '~/.mcp.json' : mcpClientType === 'cursor' ? '.vscode/mcp.json' : 'mcpServers JSON'}</span>
                  <button
                    onClick={() => {
                      const rawServerUrl = ccloudInfo?.mcpServerUrl || process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://nwlon72fjr2ekajao26cwxqfse0wedtn.lambda-url.ap-south-1.on.aws';
                      const serverToken = ccloudInfo?.apiKey || process.env.NEXT_PUBLIC_MCP_SECRET_TOKEN || process.env.HIVE_CONTEXT_SERVER_TOKEN || 'hive_sk_osstenant01';
                      const mcpEndpointUrl = rawServerUrl.replace(/\/$/, '') + '/sse';
                      const spaceName = mcpModalSpace?.databaseName || 'hive_tenant_defaultdb';
                      let cfg = {};

                      if (mcpClientType === 'antigravity') {
                        cfg = {
                          mcpServers: {
                            hivecontext: {
                              serverUrl: mcpEndpointUrl,
                              headers: {
                                Authorization: `Bearer ${serverToken}`,
                                'X-HiveContext-Tenant': spaceName
                              }
                            }
                          }
                        };
                      } else if (mcpClientType === 'cursor') {
                        cfg = {
                          mcpServers: {
                            hivecontext: {
                              serverUrl: `${mcpEndpointUrl}?tenant_id=${spaceName}`,
                              headers: {
                                Authorization: `Bearer ${serverToken}`
                              }
                            }
                          }
                        };
                      } else {
                        cfg = {
                          mcpServers: {
                            hivecontext: {
                              command: 'npx',
                              args: ['-y', 'hivecontext-mcp'],
                              env: {
                                HIVECONTEXT_API_URL: mcpEndpointUrl,
                                HIVECONTEXT_SPACE: spaceName,
                                HIVECONTEXT_API_KEY: serverToken
                              }
                            }
                          }
                        };
                      }
                      navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
                      setMcpCopied(true);
                      setTimeout(() => setMcpCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 bg-[#222] hover:bg-white hover:text-black text-white px-3 py-1 text-[10px] uppercase tracking-wider transition-colors border border-[#444] cursor-pointer"
                  >
                    <span>{mcpCopied ? '✓ Copied!' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  <code>
                    {(() => {
                      const rawServerUrl = ccloudInfo?.mcpServerUrl || process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://nwlon72fjr2ekajao26cwxqfse0wedtn.lambda-url.ap-south-1.on.aws';
                      const serverToken = ccloudInfo?.apiKey || process.env.NEXT_PUBLIC_MCP_SECRET_TOKEN || process.env.HIVE_CONTEXT_SERVER_TOKEN || 'hive_sk_osstenant01';
                      const mcpEndpointUrl = rawServerUrl.replace(/\/$/, '') + '/sse';
                      const spaceName = mcpModalSpace?.databaseName || 'hive_tenant_defaultdb';
                      let cfg = {};

                      if (mcpClientType === 'antigravity') {
                        cfg = {
                          mcpServers: {
                            hivecontext: {
                              serverUrl: mcpEndpointUrl,
                              headers: {
                                Authorization: `Bearer ${serverToken}`,
                                'X-HiveContext-Tenant': spaceName
                              }
                            }
                          }
                        };
                      } else if (mcpClientType === 'cursor') {
                        cfg = {
                          mcpServers: {
                            hivecontext: {
                              serverUrl: `${mcpEndpointUrl}?tenant_id=${spaceName}`,
                              headers: {
                                Authorization: `Bearer ${serverToken}`
                              }
                            }
                          }
                        };
                      } else {
                        cfg = {
                          mcpServers: {
                            hivecontext: {
                              command: 'npx',
                              args: ['-y', 'hivecontext-mcp'],
                              env: {
                                HIVECONTEXT_API_URL: mcpEndpointUrl,
                                HIVECONTEXT_SPACE: spaceName,
                                HIVECONTEXT_API_KEY: serverToken
                              }
                            }
                          }
                        };
                      }
                      return JSON.stringify(cfg, null, 2);
                    })()}
                  </code>
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#222]">
                <button
                  onClick={() => setMcpModalSpace(null)}
                  className="bg-[#1a1a1a] text-slate-300 font-bold py-2.5 px-6 hover:bg-[#282828] transition-colors tracking-widest uppercase border border-[#333] cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Console-Themed Styled Action Confirmation Modal */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className={`bg-[#0d0d0d] border-2 ${actionModal.variant === 'danger' ? 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4)]' : 'border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.4)]'} max-w-md w-full p-8 relative font-mono space-y-6`}>
              <h3 className={`text-xl font-bold uppercase tracking-widest flex items-center gap-2 ${actionModal.variant === 'danger' ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                <span>{actionModal.title}</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed border-t border-b border-[#222] py-4">
                {actionModal.message}
              </p>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={actionModal.onConfirm}
                  className={`flex-1 font-bold py-3 transition-colors tracking-widest uppercase cursor-pointer text-xs ${
                    actionModal.variant === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                      : 'bg-amber-600 text-white hover:bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  }`}
                >
                  {actionModal.confirmText}
                </button>
                <button
                  onClick={() => setActionModal(null)}
                  className="flex-1 bg-[#1a1a1a] text-slate-300 font-bold py-3 hover:bg-[#282828] transition-colors tracking-widest uppercase border border-[#333] cursor-pointer text-xs"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Provision New Space Popup Modal (Monochrome White Theme) */}
        {showProvisionModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] border-2 border-[#444] max-w-lg w-full p-8 shadow-[0_0_60px_rgba(255,255,255,0.1)] relative font-mono space-y-6">
              <div className="flex items-center justify-between border-b border-[#222] pb-4">
                <h3 className="text-white text-xl font-bold uppercase tracking-widest">
                  Provision Dedicated Memory Space
                </h3>
                <button 
                  onClick={() => setShowProvisionModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-300 mb-2 font-bold">
                    Memory Space Name
                  </label>
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={e => setNewSpaceName(e.target.value)}
                    placeholder="e.g. analytics_prod, team_alpha"
                    className="bg-[#141414] border border-[#333] text-white p-3 w-full focus:border-white focus:outline-none text-xs"
                    autoFocus
                  />
                  <div className="text-[10px] text-slate-400 mt-1.5">
                    Unique DB Name: <span className="text-white font-bold">hive_tenant_tenant001_{newSpaceName.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'name'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-300 mb-2 font-bold">
                    Primary Region
                  </label>
                  <select
                    value={primaryRegion}
                    onChange={e => setPrimaryRegion(e.target.value)}
                    className="bg-[#141414] border border-[#333] text-white p-3 w-full focus:border-white focus:outline-none text-xs"
                  >
                    {availableRegions.map(r => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-300 mb-2 font-bold">
                    Optional Secondary Regions (Replication)
                  </label>
                  <div className="space-y-2">
                    {availableRegions.map(r => (
                      <label 
                        key={r.code} 
                        className={`flex items-center justify-between p-3 border text-xs cursor-pointer transition-colors ${
                          secondaryRegions.includes(r.code) 
                            ? 'bg-[#1e1e1e] border-white text-white font-bold' 
                            : 'bg-[#141414] border-[#2a2a2a] text-slate-400 hover:border-[#444]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={secondaryRegions.includes(r.code)}
                            onChange={() => toggleSecondaryRegion(r.code)}
                            disabled={r.code === primaryRegion}
                            className="accent-white"
                          />
                          <span>{r.label}</span>
                        </div>
                        {r.code === primaryRegion && (
                          <span className="text-[9px] uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded font-bold">
                            Primary
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-[#222]">
                <button 
                  onClick={triggerProvision}
                  disabled={provisioningDb}
                  className="flex-1 bg-white hover:bg-slate-200 text-black font-bold py-3 transition-colors tracking-widest uppercase cursor-pointer text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {provisioningDb ? 'Deploying Space...' : 'Deploy Space'}
                </button>
                <button 
                  onClick={() => setShowProvisionModal(false)}
                  className="flex-1 bg-[#1a1a1a] text-slate-300 font-bold py-3 hover:bg-[#282828] transition-colors tracking-widest uppercase border border-[#333] cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Reset Confirmation Modal */}
        {resetConfirm && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border-2 border-red-600 max-w-md w-full p-8 shadow-[0_0_50px_rgba(220,38,38,0.3)] relative font-mono">
              <h3 className="text-red-500 text-2xl font-bold uppercase tracking-widest mb-4 animate-pulse">
                ⚠ CONFIRM PURGE
              </h3>
              <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                You are about to purge <strong className="text-white font-bold">{activeSpace.name}</strong>. {activeSpace.type === 'SHARED' ? 'This will execute a tenant-isolated purge of your memory data in the Shared space cluster.' : 'This will truncate all memories in your dedicated database space.'}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={executeReset}
                  className="flex-1 bg-red-600 text-white font-bold py-3 hover:bg-red-500 transition-colors tracking-widest uppercase cursor-pointer text-xs"
                >
                  CONFIRM PURGE
                </button>
                <button 
                  onClick={() => setResetConfirm(false)}
                  className="flex-1 bg-[#222] text-slate-300 font-bold py-3 hover:bg-[#333] transition-colors tracking-widest uppercase border border-[#444] cursor-pointer text-xs"
                >
                  ABORT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
