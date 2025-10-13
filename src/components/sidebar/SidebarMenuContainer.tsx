import { useCallback, useMemo } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { dynamicRoutes } from './menuStructure';
import { useListMenuItemsQuery } from '../../store/api';

/** Container that provides dynamic loader for routes defined in menuStructure.tsx
 * Keeps SidebarMenu presentational and free of schema-specific logic.
 */
export default function SidebarMenuContainer({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  const { selectedId: setupId } = useSetups();

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

  // Build a map of all dynamic routes to their query results
  const dynamicRouteEntries = useMemo(() => Object.entries(dynamicRoutes), []);
  
  // Create queries for all dynamic routes
  const menuQueries = dynamicRouteEntries.map(([basePath, cfg]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useListMenuItemsQuery(
      { setupId: setupId || '', schemaKey: cfg.schemaKey },
      { skip: !setupId || cfg.kind !== 'form' }
    );
    return { basePath, result, cfg };
  });

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Find the query result for this basePath
    const query = menuQueries.find(q => q.basePath === basePath);
    if (!query || !query.result.data) {
      return [];
    }
    
    const items = query.result.data.map(item => ({
      key: item.id,
      label: item.label,
    }));
    
    // Prepend "New" item with plus icon hint
    return [{ key: 'new', label: '+ New' }, ...items];
  }, [menuQueries]);

  return (
    <SidebarMenu
      menu={menuStructure}
      selectedMenuPath={selectedMenuPath}
      onSelect={onSelect}
      getDynamicConfig={getDynamicConfigForMenu}
      loadDynamicChildren={loadDynamicChildren}
      refreshBasePath={null}
    />
  );
}
