'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MemorySpace {
  id: string;
  name: string;
  type: 'ALL' | 'SHARED' | 'DEDICATED';
  dbName: string;
  planTier: string;
  status: string;
  memoriesCount?: number;
  quotaBytes?: number;
}

interface MemorySpaceContextType {
  activeSpace: MemorySpace;
  availableSpaces: MemorySpace[];
  setActiveSpace: (space: MemorySpace) => void;
  refreshSpaces: () => Promise<void>;
  loading: boolean;
}

const defaultSharedSpace: MemorySpace = {
  id: 'shared-space-cluster',
  name: 'Shared space cluster',
  type: 'SHARED',
  dbName: 'hive_tenant_defaultdb',
  planTier: 'free',
  status: 'ACTIVE_SHARED'
};

const allSpacesOption: MemorySpace = {
  id: 'all',
  name: 'All Memory Spaces',
  type: 'ALL',
  dbName: 'all',
  planTier: 'pro',
  status: 'AGGREGATED'
};

const MemorySpaceContext = createContext<MemorySpaceContextType>({
  activeSpace: allSpacesOption,
  availableSpaces: [allSpacesOption, defaultSharedSpace],
  setActiveSpace: () => {},
  refreshSpaces: async () => {},
  loading: false
});

export const MemorySpaceProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeSpace, setActiveSpace] = useState<MemorySpace>(allSpacesOption);
  const [availableSpaces, setAvailableSpaces] = useState<MemorySpace[]>([allSpacesOption, defaultSharedSpace]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshSpaces = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ccloud');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.databases)) {
        const spaces: MemorySpace[] = [
          allSpacesOption,
          ...data.databases.map((db: any) => ({
            id: db.id || db.databaseName,
            name: db.databaseName === 'hive_tenant_defaultdb' ? 'Shared space cluster' : `Dedicated DB (${db.databaseName})`,
            type: db.databaseName === 'hive_tenant_defaultdb' ? 'SHARED' : 'DEDICATED',
            dbName: db.databaseName,
            planTier: db.planTier || 'free',
            status: db.status || 'ACTIVE'
          }))
        ];
        setAvailableSpaces(spaces);
      }
    } catch (e) {
      console.error('Failed to load memory spaces:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshSpaces();
  }, []);

  return (
    <MemorySpaceContext.Provider value={{ activeSpace, availableSpaces, setActiveSpace, refreshSpaces, loading }}>
      {children}
    </MemorySpaceContext.Provider>
  );
};

export const useMemorySpace = () => useContext(MemorySpaceContext);
