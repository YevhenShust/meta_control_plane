import { useCallback, useEffect, useState } from 'react';

const KEY = 'selectedSetupId';

/**
 * Provides the current setupId and a setter, backed by localStorage.
 * This replaces the old SetupsContext selectedId behavior without global context.
 */
export function useCurrentSetupId(): [string | null, (id: string | null) => void] {
  const [setupId, setSetupIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  });

  const setSetupId = useCallback((id: string | null) => {
    try {
      if (id === null || id === '') {
        localStorage.removeItem(KEY);
        setSetupIdState(null);
      } else {
        localStorage.setItem(KEY, id);
        setSetupIdState(id);
      }
    } catch {
      setSetupIdState(id);
    }
  }, []);

  // Sync across tabs/windows via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        setSetupIdState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [setupId, setSetupId];
}

export default useCurrentSetupId;
