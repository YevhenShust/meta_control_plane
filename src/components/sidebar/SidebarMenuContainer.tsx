import { useCallback } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig as getDynCfg } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { listDraftsV1 } from '../../shared/api/drafts';
import { resolveSchemaIdByKey } from '../../core/uiLinking';

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

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Only handle Game/Chests dynamic form listing here. Keep this logic in the container.
    try {
  const cfg = getDynCfg(basePath);
      if (!cfg || cfg.kind !== 'form') return [];
      if (!setupId) return [];
      // resolve schema id by key and list drafts, then filter by schemaId
      const schemaId = await resolveSchemaIdByKey(setupId, cfg.schemaKey);
      if (!schemaId) return [];
      const drafts = await listDraftsV1(setupId);
      const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
      const items = filtered.map(d => {
        let label = String(d.id ?? '');
        try {
          const parsed: unknown = typeof d.content === 'string' ? JSON.parse(d.content) : d.content;
          if (parsed && typeof parsed === 'object') {
            const asObj = parsed as Record<string, unknown>;
            label = String(asObj['Id'] ?? asObj['name'] ?? label);
          }
        } catch {
          // ignore parse errors and keep fallback label
        }
        return { key: String(d.id ?? ''), label };
      });
      // Prepend "New" item
      return [{ key: 'new', label: 'New' }, ...items];
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
    />
  );
}
