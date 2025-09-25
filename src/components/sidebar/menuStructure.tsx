// menuStructure.tsx - unified menu + dynamic route synthesis

export type NodeKind =
  | 'form'
  | 'table'
  | 'game-root'
  | 'game-chests'
  | 'atlas-root'
  | 'atlas-location'
  | 'atlas-chests';

export interface MenuItem { title: string; kind: NodeKind; params?: Record<string, unknown>; children?: MenuItem[] }

import chestSpawnUi from '../../schemas/ui/ChestSpawn.uischema.json';
import chestUi from '../../schemas/ui/ChestDescriptor.uischema.json';

export const menuStructure: MenuItem[] = [
  { title: 'Game', kind: 'game-root', children: [{ title: 'Chests', kind: 'game-chests', children: [] }] },
  { title: 'Atlas', kind: 'atlas-root', children: [{ title: 'Location 1', kind: 'atlas-location', children: [{ title: 'Chests', kind: 'atlas-chests', children: [] }] }] },
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
export const getDynamicConfig = (basePath: string): DynRoute | null => dynamicRoutes[basePath] || null;
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
  const full = path.join('/');

  // form dynamic: base + /id
  for (const [base, route] of Object.entries(dynamicRoutes)) {
    if (route.kind === 'form' && full.startsWith(base + '/')) {
      const id = full.slice(base.length + 1);
      if (id && !id.includes('/')) return { title: id, kind: 'form', params: { schemaKey: route.schemaKey, draftId: id, uiSchema: route.uiSchema } } as MenuItem;
    }
  }

  const exact = dynamicRoutes[full];
  if (exact && exact.kind === 'table') return { title: path[path.length - 1], kind: 'table', params: { schemaKey: exact.schemaKey, uiSchema: exact.uiSchema } } as MenuItem;

  // fallback static traversal
  const [h, ...rest] = path;
  for (const n of tree) if (n.title === h) return rest.length === 0 ? n : (n.children ? findNodeByPath(rest, n.children) : null);
  return null;
}

export const isGameChestsNode = (n: MenuItem) => n.kind === 'game-chests';

export default menuStructure;
