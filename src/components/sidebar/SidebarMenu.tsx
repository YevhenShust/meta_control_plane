/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Tree } from '@blueprintjs/core';
import type { MenuItem as MenuNode } from './menuStructure';

const log = (...args: any[]) => console.debug('[SidebarMenu]', ...args);

type SidebarMenuProps = {
  selectedMenuPath: string[];
  onSelect: (path: string[]) => void;
  menu: MenuNode[];
  /** Optional: resolve whether a basePath corresponds to a dynamic route (form/table) */
  getDynamicConfig?: (basePath: string) => { schemaKey: string } | undefined;
  /** Optional: loader for dynamic children under a basePath. Should return items with key (id segment) and label. */
  loadDynamicChildren?: (basePath: string) => Promise<{ key: string; label: string }[]>;
};

function joinPath(parts: string[]) {
  return parts.join('/');
}

function buildTreeNodes(items: MenuNode[], base: string[], getDynamicConfig?: (b: string) => unknown | null): any[] {
  return items.map((it) => {
    const seg = it.kind === 'form' && it.params && typeof it.params.draftId === 'string' ? String(it.params.draftId) : it.title;
    const path = [...base, seg];
    const id = joinPath(path);

    const dyn = getDynamicConfig ? getDynamicConfig(joinPath([...base, it.title])) : null;

    const node: any = {
      id,
      label: it.title,
      icon: it.children && it.children.length ? 'folder-open' : 'document',
      // For dynamic container nodes we provide an empty childNodes array and hasCaret=true
      // so Blueprint's Tree will render an expandable caret and call onNodeExpand lazily.
      hasCaret: !!dyn,
      // IMPORTANT: childNodes === [] for dyn to show caret; undefined for leaves
      childNodes: it.children && it.children.length ? buildTreeNodes(it.children, [...base, it.title], getDynamicConfig) : (dyn ? [] : undefined),
    };

    return node;
  });
}

export default function SidebarMenu({ menu, selectedMenuPath, onSelect, getDynamicConfig, loadDynamicChildren }: SidebarMenuProps) {
  const [nodes, setNodes] = useState<any[]>(() => {
    const built = buildTreeNodes(menu, [], getDynamicConfig);
    log('init nodes', built);
    return built;
  });
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});

  const updateNodeById = (items: any[], id: string, updater: (n: any) => any): any[] =>
    items.map(n => {
      if (String(n.id) === id) return updater(n);
      if (n.childNodes) return { ...n, childNodes: updateNodeById(n.childNodes, id, updater) };
      return n;
    });

  // Reference selectedMenuPath to avoid "declared but its value is never read" / "defined but never used" errors.
  // This is intentionally a no-op for now; later you can use selectedMenuPath to highlight or expand the tree.
  useEffect(() => {
    void selectedMenuPath;
  }, [selectedMenuPath]);

  useEffect(() => {
    const built = buildTreeNodes(menu, [], getDynamicConfig);
    log('rebuild nodes due to props change', built);
    setNodes(built);
  }, [menu, getDynamicConfig]);

  const onNodeClick = (node: any) => {
    if (!node) return;
    log('onNodeClick', { id: node.id, hasChildren: !!node.childNodes?.length, hasCaret: !!node.hasCaret, isExpanded: !!node.isExpanded });

    // Якщо є діти (статичні вузли типу Game/Atlas) — перемикаємо розкриття
    if (node.childNodes && node.childNodes.length > 0) {
      const id = String(node.id);
      setNodes(prev => updateNodeById(prev, id, (n) => ({ ...n, isExpanded: !n.isExpanded })));
      return;
    }

    // Лист — передаємо шлях нагору
    onSelect(String(node.id).split('/'));
  };

  const setNodeChildren = (id: string, children: any[]) => {
    function walk(items: any[]): any[] {
      return items.map((n) => {
        if (String(n.id) === id) return { ...n, childNodes: children };
        if (n.childNodes) return { ...n, childNodes: walk(n.childNodes) };
        return n;
      });
    }
    setNodes((prev) => walk(prev));
  };

  const onNodeExpand = async (node: any) => {
    if (!node) return;
    const id = String(node.id);
    // mark expanded in state so Tree will show children
    setNodes(prev => updateNodeById(prev, id, (n) => ({ ...n, isExpanded: true })));

    // If this is a dynamic container and we have a loader, lazily load children once
    if (node.hasCaret && loadDynamicChildren && node.childNodes && node.childNodes.length === 0) {
      // Avoid duplicate concurrent loads for the same node
      if (loadingKeys[id]) return;
      setLoadingKeys(prev => ({ ...prev, [id]: true }));
      try {
        const items = await loadDynamicChildren(id);
        const children = items.map(it => ({
          id: `${id}/${it.key}`,
          label: it.label,
          icon: 'document',
        }));
        setNodeChildren(id, children);
      } catch {
        // swallow or optionally handle loading errors; keep node expanded but empty
        // console.error('Failed to load children for', id);
      } finally {
        setLoadingKeys(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }

    return;
  };

  const onNodeCollapse = (node: any) => {
    if (!node) return;
    const id = String(node.id);
    setNodes(prev => updateNodeById(prev, id, (n) => ({ ...n, isExpanded: false })));
  };

  return (
    <div className="sidebar-menu">
      {/* use a single any-cast to avoid heavy Blueprint typing here */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <Tree
        {...({
          contents: nodes,
          // Blueprint calls handlers as (nodeData, nodePath, e) — we want nodeData
          onNodeClick: (node: any) => onNodeClick(node),
          onNodeExpand: (node: any) => onNodeExpand(node),
          onNodeCollapse: (node: any) => onNodeCollapse(node),
          className: 'bp4-small',
        } as any)}
      />
    </div>
  );
}

