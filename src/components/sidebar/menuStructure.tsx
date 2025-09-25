// menuStructure.tsx - unified menu + dynamic route synthesis

export type NodeKind =
  | 'form'
  | 'table'
  | 'game-root'
  | 'game-chests'
  | 'atlas-root'
  | 'atlas-location'
  | 'atlas-chests';

export interface MenuItem {
  title: string;
  kind: NodeKind;
  params?: Record<string, unknown>;
  children?: MenuItem[];
}

import chestSpawnUi from '../../uischemas/ChestSpawn.rjsf.uischema.json';
import chestUi from '../../uischemas/ChestDescriptor.rjsf.uischema.json';

// Visible tree (no params here; same style for Game and Atlas)
export const menuStructure: MenuItem[] = [
  {
    title: 'Game',
    kind: 'game-root',
    children: [
      {
        title: 'Chests',
        kind: 'game-chests',
        children: [], // draft ids appear dynamically (via URL or Sidebar)
      },
    ],
  },
  {
    title: 'Atlas',
    kind: 'atlas-root',
    children: [
      {
        title: 'Location 1',
        kind: 'atlas-location',
        children: [
          {
            title: 'Chests',
            kind: 'atlas-chests',
            children: [],
          },
        ],
      },
    ],
  },
];

// One data-driven map for all dynamic routes (both Game & Atlas)
type DynRoute =
  | { kind: 'form'; schemaKey: string; uiSchema: unknown }
  | { kind: 'table'; schemaKey: string; uiSchema: unknown };

export const dynamicRoutes: Record<string, DynRoute> = {
  // form base: path MUST be followed by one more segment (draftId)
  'Game/Chests': { kind: 'form', schemaKey: 'ChestDescriptor', uiSchema: chestUi },

  // table exact path:
  'Atlas/Location 1/Chests': { kind: 'table', schemaKey: 'ChestSpawn', uiSchema: chestSpawnUi },
};

// helpers to read dynamic config from a base path
export function getDynamicConfig(basePath: string): DynRoute | null {
  return dynamicRoutes[basePath] || null;
}

// back-compat alias (used by SidebarMenu)
export const getDynamicFormConfig = (basePath: string) => {
  const r = dynamicRoutes[basePath];
  return r?.kind === 'form' ? r : null;
};

/**
 * Find a node by path (array of titles). Returns the MenuItem or null.
 * Now tries dynamicRoutes FIRST to synthesize form/table nodes with params,
 * then falls back to static traversal.
 */
export function findNodeByPath(path: string[], tree: MenuItem[] = menuStructure): MenuItem | null {
  if (!path || path.length === 0) return null;

  const fullPath = path.join('/');

  // 1) Try dynamic routes (data-driven, same style for Game & Atlas)

  // Form routes: base + "/<draftId>"
  for (const [key, route] of Object.entries(dynamicRoutes)) {
    if (route.kind === 'form' && fullPath.startsWith(key + '/')) {
      const draftId = fullPath.slice(key.length + 1);
      if (draftId && !draftId.includes('/')) {
        return {
          title: draftId,
          kind: 'form',
          params: { schemaKey: route.schemaKey, draftId, uiSchema: route.uiSchema },
        } as MenuItem;
      }
    }
  }

  // Table routes: exact match
  const exact = dynamicRoutes[fullPath];
  if (exact && exact.kind === 'table') {
    return {
      title: path[path.length - 1],
      kind: 'table',
      params: { schemaKey: exact.schemaKey, uiSchema: exact.uiSchema },
    } as MenuItem;
  }

  // 2) Fallback: normal static traversal (no params here)
  const [head, ...rest] = path;
  for (const node of tree) {
    if (node.title === head) {
      if (rest.length === 0) return node;
      if (!node.children) return null;
      return findNodeByPath(rest, node.children);
    }
  }

  return null;
}

export const isGameChestsNode = (n: MenuItem) => n.kind === 'game-chests';

export default menuStructure;
