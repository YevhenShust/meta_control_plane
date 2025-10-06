import { useCallback, useEffect, useState } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { listDrafts } from '../../shared/api';
import { resolveSchemaIdByKey } from '../../core/uiLinking';
import { onChanged } from '../../shared/events/DraftEvents';
import { dynamicRoutes } from './menuStructure';

/** Container that provides dynamic loader for routes defined in menuStructure.tsx
 * Keeps SidebarMenu presentational and free of schema-specific logic.
 */
export default function SidebarMenuContainer({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  const { selectedId: setupId } = useSetups();

  const [refreshBasePath, setRefreshBasePath] = useState<string | null>(null);

  // subscribe to draft change events to refresh menu branches for Game when applicable
  useEffect(() => {
    const off = onChanged((payload) => {
      try {
        console.debug('[SidebarMenuContainer] Draft changed', payload);
        if (!payload || !payload.schemaKey || payload.setupId !== setupId) return;

        // Find basePath(s) in dynamicRoutes that map to this schemaKey
        const bases = Object.entries(dynamicRoutes).filter(([, cfg]) => cfg.kind === 'form' && cfg.schemaKey === payload.schemaKey).map(([b]) => b);
        if (bases.length === 0) return;

        // If current selectedMenuPath starts with any of the found bases (Game container view), trigger refresh
        const current = selectedMenuPath.join('/');
        for (const b of bases) {
          if (current.startsWith(b)) {
            console.debug('[SidebarMenuContainer] triggering refresh for base', b);
            setRefreshBasePath(b);
            // clear after short tick to allow SidebarMenu effect to run
            setTimeout(() => setRefreshBasePath(null), 2000);
            return;
          }
        }
      } catch {
        // ignore
      }
    });
    return off;
  }, [setupId, selectedMenuPath]);

    const getDynamicConfigForMenu = useCallback((b: string) => {
    const cfg = getDynCfg(b);
    if (cfg && typeof cfg === 'object' && 'schemaKey' in cfg) {
      const maybeSchemaKey = (cfg as { schemaKey: unknown }).schemaKey;
      if (typeof maybeSchemaKey === 'string') {
        return { schemaKey: maybeSchemaKey };
      }
    }
    return undefined;
    }, []);

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Only handle Game/Chests dynamic form listing here. Keep this logic in the container.
    try {
  const cfg = getDynCfg(basePath);
      if (!cfg || cfg.kind !== 'form') return [];
      if (!setupId) return [];
      // resolve schema id by key and list drafts, then filter by schemaId
      const schemaId = await resolveSchemaIdByKey(setupId, cfg.schemaKey);
      if (!schemaId) return [];
      const drafts = await listDrafts(setupId);
      const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
      const items = filtered.map(d => {
        let label = String(d.id ?? '');
        const parsed = d.content;
        if (parsed && typeof parsed === 'object') {
          const asObj = parsed as Record<string, unknown>;
          label = String(asObj['Id'] ?? asObj['name'] ?? label);
        }
        return { key: String(d.id ?? ''), label };
      });
      // Prepend "New" item with plus icon hint
      return [{ key: 'new', label: '+ New' }, ...items];
    } catch {
      return [];
    }
  }, [setupId]);

  return (
    <SidebarMenu
      menu={menuStructure}
      selectedMenuPath={selectedMenuPath}
      onSelect={onSelect}
      getDynamicConfig={getDynamicConfigForMenu}
      loadDynamicChildren={loadDynamicChildren}
      refreshBasePath={refreshBasePath}
    />
  );
}
