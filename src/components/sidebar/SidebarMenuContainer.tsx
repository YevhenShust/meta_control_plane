import { useCallback } from 'react';
import SidebarMenu from './SidebarMenu';
import menuStructure, { getDynamicConfig } from './menuStructure';
import useSetups from '../../setup/useSetups';
import { listDraftsV1 } from '../../shared/api/drafts';
import { resolveSchemaIdByKey } from '../../core/uiLinking';

/** Container that provides dynamic loader for routes defined in menuStructure.tsx
 * Keeps SidebarMenu presentational and free of schema-specific logic.
 */
export default function SidebarMenuContainer({ selectedMenuPath, onSelect }: { selectedMenuPath: string[]; onSelect: (p: string[]) => void }) {
  const { selectedId: setupId } = useSetups();

  const loadDynamicChildren = useCallback(async (basePath: string) => {
    // Only handle Game/Chests dynamic form listing here. Keep this logic in the container.
    try {
      const cfg = getDynamicConfig(basePath);
      if (!cfg || cfg.kind !== 'form') return [];
      if (!setupId) return [];
      // resolve schema id by key and list drafts, then filter by schemaId
      const schemaId = await resolveSchemaIdByKey(setupId, cfg.schemaKey);
      if (!schemaId) return [];
      const drafts = await listDraftsV1(setupId);
      const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
      return filtered.map(d => {
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
    } catch {
      return [];
    }
  }, [setupId]);

  return (
    <SidebarMenu
      menu={menuStructure}
      selectedMenuPath={selectedMenuPath}
      onSelect={onSelect}
      getDynamicConfig={(b) => {
        const cfg = getDynamicConfig(b);
        return cfg && typeof cfg.schemaKey === 'string' ? { schemaKey: cfg.schemaKey } : undefined;
      }}
      loadDynamicChildren={loadDynamicChildren}
    />
  );
}
