/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Tree } from '@blueprintjs/core';
import type { MenuItem as MenuNode } from './menuStructure';

type SidebarMenuProps = {
  selectedMenuPath: string[];
  onSelect: (path: string[]) => void;
  menu: MenuNode[];
  /** Return config for dynamic container node; basePath looks like 'Game/Chests' */
  getDynamicConfig?: (basePath: string) => { schemaKey: string } | undefined;
  /** Load dynamic children for a container id (e.g. 'Game/Chests') */
  loadDynamicChildren?: (basePath: string) => Promise<{ key: string; label: string }[]>;
  /** Optional: when set to a basePath, force-reload that container's children */
  refreshBasePath?: string | null;
};

function joinPath(parts: string[]) {
  return parts.join('/');
}

/** Створення дерева з меню; для динамічних контейнерів: hasCaret=true, childNodes=[] */
function buildTreeNodes(items: MenuNode[], base: string[], getDynamicConfig?: (b: string) => unknown | null): any[] {
  return items.map((it) => {
    const seg =
      it.kind === 'form' && it.params && typeof it.params.draftId === 'string'
        ? String(it.params.draftId)
        : it.title;

    const path = [...base, seg];
    const id = joinPath(path);

    // dyn визначається для контейнера за title (а не seg з draftId)
    const dyn = getDynamicConfig ? getDynamicConfig(joinPath([...base, it.title])) : null;

    const node: any = {
      id,
      label: it.title,
      icon: it.children && it.children.length ? 'folder-open' : 'document',
      hasCaret: !!dyn,
      childNodes:
        it.children && it.children.length
          ? buildTreeNodes(it.children, [...base, it.title], getDynamicConfig)
          : dyn
          ? [] // важливо: порожній масив => показати каретку й дозволити lazy-load
          : undefined,
    };

    return node;
  });
}

export default function SidebarMenu({
  menu,
  selectedMenuPath: pathFromUrl,
  onSelect,
  getDynamicConfig,
  loadDynamicChildren,
  refreshBasePath,
}: SidebarMenuProps) {
  const [nodes, setNodes] = useState<any[]>(() => buildTreeNodes(menu, [], getDynamicConfig));
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const nodesRef = useRef<any[]>(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  /** Пошук ноди за id у поточному дереві */
  const findNode = useCallback((items: any[], id: string): any | null => {
    for (const n of items) {
      if (String(n.id) === id) return n;
      if (n.childNodes) {
        const found = findNode(n.childNodes, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  /** Імм’ютабельне оновлення ноди за id */
  const updateNodeById = useCallback(
    (items: any[], id: string, updater: (n: any) => any): any[] =>
      items.map((n) => {
        if (String(n.id) === id) return updater(n);
        if (n.childNodes) return { ...n, childNodes: updateNodeById(n.childNodes, id, updater) };
        return n;
      }),
    []
  );

  const setNodeChildren = useCallback((id: string, children: any[]) => {
    function walk(items: any[]): any[] {
      return items.map((n) => {
        if (String(n.id) === id) return { ...n, childNodes: children };
        if (n.childNodes) return { ...n, childNodes: walk(n.childNodes) };
        return n;
      });
    }
    setNodes((prev) => walk(prev));
  }, []);

  /** Ліниве завантаження дітей контейнера (один раз) + розгортання */
  const ensureExpandedAndLoaded = useCallback(
    async (containerId: string) => {
      // розгортаємо
      setNodes((prev) => updateNodeById(prev, containerId, (n) => ({ ...n, isExpanded: true })));

      // якщо це динамічний контейнер і діти ще не завантажені — тягнемо
      const snapshot = nodesRef.current;
      const node = findNode(snapshot, containerId);
      if (!node || !node.hasCaret || !loadDynamicChildren) return;

      const needsLoad = !node.childNodes || node.childNodes.length === 0;
      if (!needsLoad) return;

      if (loadingKeys[containerId]) return; // уже вантажиться
      setLoadingKeys((p) => ({ ...p, [containerId]: true }));
      try {
        const items = await loadDynamicChildren(containerId);
        const children = items.map((it) => ({
          id: `${containerId}/${it.key}`,
          label: it.label,
          icon: 'document',
        }));
        setNodeChildren(containerId, children);
      } finally {
        setLoadingKeys((p) => {
          const next = { ...p };
          delete next[containerId];
          return next;
        });
      }
    },
    [findNode, loadDynamicChildren, loadingKeys, setNodeChildren, updateNodeById]
  );

  /** 1) Перебудовуємо дерево тільки коли міняється menu/getDynamicConfig */
  useEffect(() => {
    setNodes(buildTreeNodes(menu, [], getDynamicConfig));
  }, [menu, getDynamicConfig]);

  /** 2) Матеріалізуємо шлях із URL: розгортаємо предків, підвантажуємо динаміку, НЕ перебудовуючи дерево */
  useEffect(() => {
    if (!pathFromUrl || pathFromUrl.length < 2) return;

    (async () => {
      // Префікси шляху: Game → Game/Chests → ...
      for (let i = 1; i < pathFromUrl.length; i++) {
        const prefixId = joinPath(pathFromUrl.slice(0, i));
        const node = findNode(nodesRef.current, prefixId);
        if (!node) break;

        if (node.hasCaret) {
          await ensureExpandedAndLoaded(prefixId);
        } else if (node.childNodes) {
          // статичний контейнер
          setNodes((prev) => updateNodeById(prev, prefixId, (n) => ({ ...n, isExpanded: true })));
        }
      }
    })();
  }, [pathFromUrl, findNode, ensureExpandedAndLoaded, updateNodeById]);

  /** If a parent asked to refresh a basePath, force reload its children */
  useEffect(() => {
    if (!refreshBasePath) return;
    (async () => {
      try {
  if (import.meta.env.DEV) console.debug('[SidebarMenu] refresh requested for', refreshBasePath);
        const node = findNode(nodesRef.current, refreshBasePath);
        if (!node || !node.hasCaret || !loadDynamicChildren) return;
        setLoadingKeys((p) => ({ ...p, [refreshBasePath]: true }));
        const items = await loadDynamicChildren(refreshBasePath);
        const children = items.map((it) => ({ id: `${refreshBasePath}/${it.key}`, label: it.label, icon: 'document' }));
        setNodeChildren(refreshBasePath, children);
        setNodes((prev) => updateNodeById(prev, refreshBasePath, (n) => ({ ...n, isExpanded: true })));
  if (import.meta.env.DEV) console.debug('[SidebarMenu] refreshed children for', refreshBasePath, 'count=', children.length);
      } catch {
  if (import.meta.env.DEV) console.debug('[SidebarMenu] refresh failed for', refreshBasePath);
      } finally {
        setLoadingKeys((p) => {
          const next = { ...p };
          delete next[refreshBasePath];
          return next;
        });
      }
    })();
  }, [refreshBasePath, findNode, loadDynamicChildren, setNodeChildren, updateNodeById]);

  /** Клік по вузлу */
  const onNodeClick = (node: any) => {
    if (!node) return;
    const id = String(node.id);

    // 1) Завжди оновлюємо selection → URL синхронізується
    onSelect(id.split('/'));

    // 2) Далі поведінка вузла
    const isLeaf = !node.hasCaret && (!node.childNodes || node.childNodes.length === 0);

    if (isLeaf) {
      return; // для листка більше нічого
    }

    if (node.hasCaret) {
      // динамічний контейнер: лінивий лоад + розгортання
      if (node.isExpanded) {
        onNodeCollapse(node);
      } else {
        void onNodeExpand(node);
      }
      return;
    }

    // статичний контейнер: просто toggle
    const hasStaticChildren = !!node.childNodes && node.childNodes.length > 0 && !node.hasCaret;
    if (hasStaticChildren) {
      setNodes((prev) => updateNodeById(prev, id, (n) => ({ ...n, isExpanded: !n.isExpanded })));
    }
  };

  const onNodeExpand = async (node: any) => {
    await ensureExpandedAndLoaded(String(node.id));
  };

  const onNodeCollapse = (node: any) => {
    const id = String(node.id);
    setNodes((prev) => updateNodeById(prev, id, (n) => ({ ...n, isExpanded: false })));
  };

  return (
    <Tree
      {...({
        contents: nodes,
        onNodeClick: (n: any) => onNodeClick(n),
        onNodeExpand: (n: any) => onNodeExpand(n),
        onNodeCollapse: (n: any) => onNodeCollapse(n),
      } as any)}
    />
  );
}
