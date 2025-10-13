import { useCallback, useEffect, useMemo, useState } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { dynamicRoutes } from './menuStructure';
import { useListMenuItemsQuery } from '../../store/api';
import { MENU_REFRESH_RESET_MS } from '../../shared/constants';

/** Container that provides dynamic loader for routes defined in menuStructure.tsx
 * Keeps SidebarMenu presentational and free of schema-specific logic.
 */
export default function SidebarMenuContainer({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  const { selectedId: setupId } = useSetups();

  const [refreshBasePath, setRefreshBasePath] = useState<string | null>(null);

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

  // Create a stable map of basePath -> schemaKey for dynamic routes
  const dynamicRouteMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [basePath, cfg] of Object.entries(dynamicRoutes)) {
      if (cfg.kind === 'form') {
        map[basePath] = cfg.schemaKey;
      }
    }
    return map;
  }, []);

  // Use RTK Query hooks for each dynamic route (must be stable)
  // For now we support a fixed set of dynamic routes; Game/Chests is the only one
  const gameChestsQuery = useListMenuItemsQuery(
    { setupId: setupId || '', schemaKey: 'ChestDescriptor' },
    { skip: !setupId }
  );

  // Trigger refresh when RTK Query data changes (after refetch from tag invalidation)
  useEffect(() => {
    // Only trigger refresh if we have data and the menu is expanded
    if (gameChestsQuery.data && selectedMenuPath.length > 0) {
      const current = selectedMenuPath.join('/');
      // Check if we're viewing the Game/Chests branch
      if (current.startsWith('Game/Chests')) {
        setRefreshBasePath('Game/Chests');
        setTimeout(() => setRefreshBasePath(null), MENU_REFRESH_RESET_MS);
      }
    }
  }, [gameChestsQuery.data, selectedMenuPath]);

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Map basePath to the appropriate query result
    const schemaKey = dynamicRouteMap[basePath];
    if (!schemaKey) return [];
    
    // For now, we only have Game/Chests
    let queryData;
    if (basePath === 'Game/Chests') {
      queryData = gameChestsQuery.data;
    }
    
    if (!queryData) return [];
    
    const items = queryData.map(item => ({
      key: item.id,
      label: item.label,
    }));
    
    // Prepend "New" item with plus icon hint
    return [{ key: 'new', label: '+ New' }, ...items];
  }, [dynamicRouteMap, gameChestsQuery.data]);

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
