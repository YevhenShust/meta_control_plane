import React, { useEffect, useState } from 'react';

type ScreenModule = { default: React.ComponentType<{ params?: Record<string, string> }> };

// Loaders for all screen modules under src/screens
const loaders = import.meta.glob<ScreenModule>('../screens/**/*.screen.tsx');

const registry: Record<string, string> = {
  'atlas-chests': '../screens/atlas/SpawnsTable.screen.tsx',
  'game-chests': '../screens/game/ChestsTable.screen.tsx',
  'chest-editor': '../screens/game/ChestEditor.screen.tsx',
};

export default function EntityHost({ kind, params }: { kind: string; params?: Record<string, string> }) {
  const [Loaded, setLoaded] = useState<React.ComponentType<{ params?: Record<string, string> }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolveLoaderPath(target: string): string | null {
    // 1) exact key
    if ((loaders as Record<string, unknown>)[target]) return target;
    // 2) suffix match (handle different relative bases)
    const key = Object.keys(loaders).find(k => k.endsWith(target.replace(/^\.{1,2}\//, '')));
    return key ?? null;
  }

  useEffect(() => {
    setLoaded(null);
    setError(null);
    setLoading(false);

    console.log('[EntityHost] registry', registry);
    console.log('[EntityHost] available loaders', Object.keys(loaders));
    console.log('[EntityHost] requested kind', kind, '→', registry[kind]);

    const target = registry[kind];
    if (!target) return; // fallback handled in render

    let key: string | null = null;
    try {
      key = resolveLoaderPath ? resolveLoaderPath(target) : null;
    } catch {
      key = null;
    }

    if (!key) {
      // fallback: simple suffix-based search for the common ChestEditor path
      key = (loaders as Record<string, unknown>)[target] ? target : Object.keys(loaders).find(k => k.endsWith('/screens/game/ChestEditor.screen.tsx')) ?? null;
      if (!key) {
        setError('Loader not found for ChestEditor.screen.tsx');
        return;
      }
    }

    const loader = (loaders as Record<string, () => Promise<unknown>>)[key];
    if (!loader) {
      setError(`No loader for key: ${key}`);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const mod = await loader();
        const d = (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
        if (d) setLoaded(() => d as React.ComponentType<{ params?: Record<string, string> }>);
        else setError('Module has no default export');
      } catch (e: unknown) {
        let msg = 'Failed to load module';
        if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
          msg = (e as { message?: unknown }).message as string;
        } else if (typeof e === 'string') {
          msg = e;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [kind]);

  if (!registry[kind]) {
    return <div>Missing renderer for kind: {kind}</div>;
  }

  if (error) {
    console.error(error, { kind, registry, available: Object.keys(loaders) });
    return <div>Renderer failed: {error}</div>;
  }

  if (loading || !Loaded) return <div>Loading renderer…</div>;

  return <Loaded params={params} />;
}
