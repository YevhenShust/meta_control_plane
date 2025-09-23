// menuStructure.tsx - typed menu tree + helper

export type NodeKind =
  | 'form'
  | 'table'
  | 'game-root'
  | 'game-chests'
  | 'atlas-root'
  | 'atlas-location';

export interface MenuItem {
  title: string;
  kind: NodeKind;
  params?: Record<string, unknown>;
  children?: MenuItem[];
}

import chestSpawnUi from '../../ui/ChestSpawn.rjsf.uischema.json';

export const menuStructure: MenuItem[] = [
  {
    title: 'Game',
    kind: 'game-root',
    children: [
      {
        title: 'Chests',
        kind: 'game-chests',
        children: [],
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
        params: { locationId: '1' },
        children: [
          {
            title: 'Chests',
            kind: 'table',
            params: { schemaKey: 'ChestSpawn', uiSchema: chestSpawnUi },
          },
        ],
      },
    ],
  },
];

/**
 * Find a node by path (array of titles). Returns the MenuItem or null when not found.
 * Example: findNodeByPath(['Game','Chests','Legendary chest'])
 */
export function findNodeByPath(path: string[], tree: MenuItem[] = menuStructure): MenuItem | null {
  if (!path || path.length === 0) return null;
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

// Back-compat default export
export default menuStructure;
