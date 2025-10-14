import React, { useCallback, useMemo, useState } from 'react';
import SetupsContext from './SetupsContext';

const KEY = 'selectedSetupId';

export const SetupsProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const [selectedId, setSelectedIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  });

  const setSelectedId = useCallback((id: string | null) => {
    try {
      if (id === null || id === '') {
        localStorage.removeItem(KEY);
        setSelectedIdState(null);
      } else {
        localStorage.setItem(KEY, id);
        setSelectedIdState(id);
      }
    } catch {
      setSelectedIdState(id);
    }
  }, []);

  const value = useMemo(() => ({ selectedId, setSelectedId }), [selectedId, setSelectedId]);
  return <SetupsContext.Provider value={value}>{children}</SetupsContext.Provider>;
};

