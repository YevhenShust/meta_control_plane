import { useCallback } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { useListMenuItemsQuery } from '../../store/api';
import { dynamicRoutes } from './menuStructure';

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

  // For each dynamic route (form type), subscribe to its menu data via RTK Query
  // This allows automatic refresh when drafts are created/updated
  const dynamicFormRoutes = Object.entries(dynamicRoutes).filter(([, cfg]) => cfg.kind === 'form');
  
  // Create queries for all dynamic form routes
  const menuQueries = dynamicFormRoutes.map(([basePath, cfg]) => {
    const schemaKey = cfg.schemaKey;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useListMenuItemsQuery(
      { setupId: setupId || '', schemaKey },
      { skip: !setupId }
    );
    return { basePath, schemaKey, query };
  });

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Find the query for this basePath
    const menuQuery = menuQueries.find(q => q.basePath === basePath);
    if (!menuQuery) return [];

    // Use cached data from RTK Query
    const items = menuQuery.query.data?.map(d => ({
      key: d.id,
      label: d.label
    })) || [];

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
