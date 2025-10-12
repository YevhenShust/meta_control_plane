import { useCallback, useEffect, useRef, useState } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { useListMenuItemsQuery } from '../../store/api';

/** Container that provides dynamic loader for routes defined in menuStructure.tsx
 * Keeps SidebarMenu presentational and free of schema-specific logic.
 */
export default function SidebarMenuContainer({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  const { selectedId: setupId } = useSetups();
  const [refreshBasePath, setRefreshBasePath] = useState<string | null>(null);
  const prevDataLengthRef = useRef<number>(0);

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
  // Currently only 'Game/Chests' is a form route with schemaKey 'ChestDescriptor'
  const chestMenuQuery = useListMenuItemsQuery(
    { setupId: setupId || '', schemaKey: 'ChestDescriptor' },
    { skip: !setupId }
  );

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Handle Game/Chests dynamic route
    if (basePath === 'Game/Chests') {
      const items = chestMenuQuery.data?.map(d => ({
        key: d.id,
        label: d.label
      })) || [];
      
      // Append "New" item with plus icon hint at the end
      return [...items, { key: 'new', label: '+ New' }];
    }

    return [];
  }, [chestMenuQuery.data]);

  // When query data changes after initial load, trigger refresh of the menu
  useEffect(() => {
    const currentLength = chestMenuQuery.data?.length ?? 0;
    const prevLength = prevDataLengthRef.current;
    
    // Only trigger refresh if data has actually changed (not on initial mount)
    if (chestMenuQuery.data && !chestMenuQuery.isLoading && prevLength !== currentLength) {
      setRefreshBasePath('Game/Chests');
      // Clear the refresh trigger after a short delay to allow it to be used again
      const timer = setTimeout(() => setRefreshBasePath(null), 100);
      prevDataLengthRef.current = currentLength;
      return () => clearTimeout(timer);
    }
    
    // Update the ref even if we don't trigger refresh
    prevDataLengthRef.current = currentLength;
  }, [chestMenuQuery.data, chestMenuQuery.isLoading]);

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
