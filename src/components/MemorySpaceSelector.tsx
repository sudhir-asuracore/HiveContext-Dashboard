'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMemorySpace, MemorySpace } from '@/context/MemorySpaceContext';
import { Database, Server, Layers, ChevronDown, Check } from 'lucide-react';

export default function MemorySpaceSelector() {
  const { activeSpace, availableSpaces, setActiveSpace } = useMemorySpace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative font-mono text-xs z-40" ref={dropdownRef}>
      {/* Plain White / Monochrome Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-[#121212] border border-[#333] px-3.5 py-2 hover:border-white transition-all cursor-pointer shadow-sm group"
      >
        <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-[10px]">
          {activeSpace.type === 'SHARED' ? (
            <Server className="w-3.5 h-3.5 text-white" />
          ) : activeSpace.type === 'DEDICATED' ? (
            <Database className="w-3.5 h-3.5 text-white" />
          ) : (
            <Layers className="w-3.5 h-3.5 text-white" />
          )}
          <span className="text-slate-400">Space:</span>
        </div>

        <span className="text-white font-bold tracking-wide">
          {activeSpace.name}
        </span>

        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold tracking-widest bg-[#222] text-slate-200 border border-[#444] ml-1">
          {activeSpace.type}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Monochrome Console-Themed Custom Dropdown Popup Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0d0d0d] border border-[#333] shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden z-50 divide-y divide-[#222]">
          <div className="p-2 bg-[#171717] text-[9px] uppercase text-white font-bold tracking-widest flex items-center justify-between border-b border-[#2a2a2a]">
            <span>Select Active Memory Space</span>
            <span className="text-slate-400">{availableSpaces.length} Available</span>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto divide-y divide-[#1a1a1a]">
            {availableSpaces.map((space: MemorySpace) => {
              const isSelected = space.id === activeSpace.id;
              return (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => {
                    setActiveSpace(space);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors text-xs cursor-pointer ${
                    isSelected 
                      ? 'bg-[#222] text-white font-bold border-l-2 border-white' 
                      : 'text-slate-300 hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {space.type === 'SHARED' ? (
                      <Server className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    ) : space.type === 'DEDICATED' ? (
                      <Database className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate">{space.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold tracking-widest bg-[#222] text-slate-200 border border-[#444]">
                      {space.type}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
