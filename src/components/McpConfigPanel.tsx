'use client';

import React, { useState } from 'react';
import { useMemorySpace, MemorySpace } from '@/context/MemorySpaceContext';
import { Copy, Check, Terminal, Server, Cpu } from 'lucide-react';

export default function McpConfigPanel() {
  const { activeSpace, availableSpaces } = useMemorySpace();
  const [selectedSpaceId, setSelectedSpaceId] = useState(activeSpace.id);
  const [clientType, setClientType] = useState<'antigravity' | 'cursor' | 'stdio'>('antigravity');
  const [copied, setCopied] = useState(false);

  const currentSpace = availableSpaces.find(s => s.id === selectedSpaceId) || activeSpace;
  const rawServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://<your-fastmcp-lambda-url>.lambda-url.<region>.on.aws';
  const serverToken = process.env.NEXT_PUBLIC_MCP_SECRET_TOKEN || 'hive_sk_your_bearer_token';
  const mcpEndpointUrl = rawServerUrl.replace(/\/$/, '') + '/sse';

  let jsonConfig = {};

  if (clientType === 'antigravity') {
    jsonConfig = {
      mcpServers: {
        hivecontext: {
          serverUrl: mcpEndpointUrl,
          headers: {
            Authorization: `Bearer ${serverToken}`,
            'X-HiveContext-Tenant': currentSpace.id
          }
        }
      }
    };
  } else if (clientType === 'cursor') {
    jsonConfig = {
      mcpServers: {
        hivecontext: {
          serverUrl: `${mcpEndpointUrl}?tenant_id=${currentSpace.id}`,
          headers: {
            Authorization: `Bearer ${serverToken}`
          }
        }
      }
    };
  } else {
    jsonConfig = {
      mcpServers: {
        hivecontext: {
          command: 'npx',
          args: ['-y', 'hivecontext-mcp'],
          env: {
            HIVECONTEXT_API_URL: mcpEndpointUrl,
            HIVECONTEXT_SPACE: currentSpace.id,
            HIVECONTEXT_API_KEY: serverToken
          }
        }
      }
    };
  }

  const jsonString = JSON.stringify(jsonConfig, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="border border-[#222] p-8 relative bg-[#0a0a0a] font-mono space-y-6">
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-500"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-500"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-500"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-500"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#222] gap-4">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Agentic MCP Setup</span>
          <h2 className="text-xl text-white font-bold uppercase tracking-wider mt-1 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-white" />
            MCP Client Configuration &amp; Space Routing
          </h2>
        </div>

        {/* Space Selector for MCP Config */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase">Target Space:</span>
          <select
            value={selectedSpaceId}
            onChange={(e) => setSelectedSpaceId(e.target.value)}
            className="bg-[#141414] border border-[#333] text-white p-2 text-xs focus:border-white focus:outline-none cursor-pointer font-mono font-bold"
          >
            {availableSpaces.map((s: MemorySpace) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Connect your AI Coding Assistants (<strong className="text-white">Antigravity</strong>, <strong className="text-white">Claude Desktop</strong>, <strong className="text-white">Cursor</strong>, or <strong className="text-white">Stdio CLI</strong>) directly to <strong className="text-white">{currentSpace.name}</strong>. Memories generated or queried by agents will automatically route to this target database.
      </p>

      {/* Tabs for Client Selection */}
      <div className="flex border-b border-[#222] gap-2">
        <button
          onClick={() => setClientType('antigravity')}
          className={`px-4 py-2 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
            clientType === 'antigravity'
              ? 'border-white text-white bg-[#141414]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Antigravity / Claude (~/.mcp.json)
        </button>

        <button
          onClick={() => setClientType('cursor')}
          className={`px-4 py-2 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
            clientType === 'cursor'
              ? 'border-white text-white bg-[#141414]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Cursor / VS Code (.vscode/mcp.json)
        </button>

        <button
          onClick={() => setClientType('stdio')}
          className={`px-4 py-2 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
            clientType === 'stdio'
              ? 'border-white text-white bg-[#141414]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Stdio CLI Process
        </button>
      </div>

      {/* JSON Code Snippet Viewer */}
      <div className="bg-[#050505] border border-[#222] relative group">
        <div className="flex items-center justify-between p-3 bg-[#111] border-b border-[#222] text-[10px] text-slate-400 uppercase font-bold">
          <span>{clientType === 'antigravity' ? '~/.mcp.json' : clientType === 'cursor' ? '.vscode/mcp.json' : 'mcpServers JSON Config'}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-[#222] hover:bg-white hover:text-black text-white px-3 py-1 text-[10px] uppercase tracking-wider transition-colors border border-[#444] cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
          <code>{jsonString}</code>
        </pre>
      </div>
    </section>
  );
}
