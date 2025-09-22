import React, { createContext, useEffect, useState, useCallback } from 'react';
import { listSetups, createSetup as apiCreateSetup, getSetupById, type SetupDto } from '../shared/api/setup';

export type Setup = { id: string; name: string };

type Value = {
  setups: Setup[];
  selectedId: string | null;
  setSelectedId(id: string | null): void;
  refresh(): Promise<void>;
  createSetup(name: string): Promise<void>;
};

const KEY = 'selectedSetupId';

const SetupsContext = createContext<Value | null>(null);

export const SetupsProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const [setups, setSetups] = useState<Setup[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      // ignore localStorage errors
      return null;
    }
  });

  const fetchSetups = useCallback(async () => {
    try {
      const data = await listSetups();
      setSetups(Array.isArray(data) ? data.map((d: SetupDto) => ({ id: d.id as string, name: (d.name as string) || (d.id as string) })) : []);
    } catch {
      setSetups([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchSetups();
      if (!selectedId) return;
      const exists = setups.find(s => s.id === selectedId);
      if (!exists) {
        try {
          const s = await getSetupById(selectedId);
          if (!s) setSelectedIdState(null);
        } catch {
          setSelectedIdState(null);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSetups]);

  const setSelectedId = useCallback((id: string | null) => {
    try {
      if (id === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, id);
    } catch {
      // ignore localStorage errors
    }
    setSelectedIdState(id);
  }, []);

  const refresh = useCallback(async () => {
    await fetchSetups();
  }, [fetchSetups]);

  const createSetup = useCallback(async (name: string) => {
    try {
      await apiCreateSetup({ name });
      await fetchSetups();
    } catch {
      // swallow errors per spec
    }
  }, [fetchSetups]);

  const value: Value = {
    setups,
    selectedId,
    setSelectedId,
    refresh,
    createSetup,
  };

  return <SetupsContext.Provider value={value}>{children}</SetupsContext.Provider>;
};

export default SetupsContext;
