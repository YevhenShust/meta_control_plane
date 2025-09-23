import React, { useEffect, useState } from 'react';
import FormRenderer from '../renderers/FormRenderer';

// Loaders for all screen modules under src/screens
const loaders = import.meta.glob<{ default: React.ComponentType<{ params?: Record<string, string> }> }>('../screens/**/*.screen.tsx');

const registry: Record<string, string> = {
  'atlas-chests': '../screens/atlas/AtlasChestSpawns.screen.tsx',
};

export default function EntityHost({ kind, params }: { kind: string; params?: Record<string, string> }) {
  const [Loaded, setLoaded] = useState<React.ComponentType<{ params?: Record<string, string> }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGameChestsEmpty = kind === 'game-chests' && (!params || Object.keys(params).length === 0);
  const target = registry[kind];

  // loader effect (always declared to preserve hook order)
  useEffect(() => {
    let mounted = true;
    setLoaded(null);
    setError(null);
    setLoading(false);

    if (isGameChestsEmpty) return;
    if (kind === 'form') return;
    if (!target) return;

    const key = (loaders as Record<string, unknown>)[target]
      ? target
      : Object.keys(loaders).find(k => k.endsWith(target.replace(/^\.{1,2}\//, ''))) ?? null;

    if (!key) {
      setError('Loader not found for: ' + target);
      return;
    }

    const loader = (loaders as Record<string, () => Promise<unknown>>)[key];
    if (!loader) {
      setError('No loader for key: ' + key);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const mod = await loader();
        const d = (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
        if (mounted) {
          if (d) setLoaded(() => d as React.ComponentType<{ params?: Record<string, string> }>);
          else setError('Module has no default export');
        }
      } catch (e: unknown) {
        let msg = 'Failed to load module';
        if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
          msg = (e as { message?: unknown }).message as string;
        } else if (typeof e === 'string') {
          msg = e;
        }
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [isGameChestsEmpty, kind, target, params]);

  // early placeholder for game-chests without selected child
  if (isGameChestsEmpty) {
    return <div style={{ padding: 8 }}>Select a chest</div>;
  }

  // handle direct form renderer nodes
  if (kind === 'form') {
    const schemaKey = params?.schemaKey as string;
    const draftId = params?.draftId as string;
    if (!schemaKey || !draftId) return <div>Missing schemaKey or draftId</div>;
    return <FormRenderer schemaKey={schemaKey} draftId={draftId} />;
  }

  if (!target) {
    return <div>Missing renderer for kind: {kind}</div>;
  }

  if (error) {
    console.error(error, { kind, target });
    return <div>Renderer failed: {error}</div>;
  }

  if (loading || !Loaded) return <div>Loading renderer…</div>;

  return <Loaded params={params} />;
}

