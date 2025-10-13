import { useCallback, useState } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';

/** Container that provides dynamic loader for routes defined in menuStructure.tsx
 * Keeps SidebarMenu presentational and free of schema-specific logic.
 */
export default function SidebarMenuContainer({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  const { selectedId: setupId } = useSetups();

  const [refreshBasePath] = useState<string | null>(null);

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
      
      // Use the schemaKey directly from config to query menu items
      // Note: This is a synchronous callback that needs to return a promise
      // We'll fetch the data imperatively here
      const { store } = await import('../../store');
      const state = store.getState();
      const apiState = state.api;
      
      // Check if we have cached data
      const cacheKey = `listMenuItems({"setupId":"${setupId}","schemaKey":"${cfg.schemaKey}"})`;
      const cached = apiState.queries[cacheKey];
      
      if (cached && cached.status === 'fulfilled' && cached.data) {
        const items = (cached.data as Array<{ id: string; label: string }>).map(d => ({
          key: d.id,
          label: d.label
        }));
        // Prepend "New" item
        return [{ key: 'new', label: '+ New' }, ...items];
      }
      
      // If not cached, trigger a fetch and return empty for now
      // The menu will update when the data arrives via RTK Query cache
      store.dispatch(
        (await import('../../store/api')).apiSlice.endpoints.listMenuItems.initiate({
          setupId,
          schemaKey: cfg.schemaKey
        })
      );
      
      return [{ key: 'new', label: '+ New' }];
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
