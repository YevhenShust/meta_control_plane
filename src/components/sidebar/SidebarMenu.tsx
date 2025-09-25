import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useState } from "react";
import type { MenuItem } from "./menuStructure";
import { useDraftMenu } from '../../menu/useDraftMenu';
import { isGameChestsNode } from './menuStructure';

type SidebarMenuProps = {
  menu: MenuItem[];
  selectedMenuPath: string[];
  onSelect: (path: string[]) => void;
};

type AntMenuItem = NonNullable<MenuProps['items']>[number];

function toKey(path: string[]) {
  return path.join("/");
}

function buildItems(items: MenuItem[], base: string[] = [], hookItems: MenuProps['items'] = []): NonNullable<MenuProps['items']> {
  return items.map((it) => {
    const seg =
      it.kind === 'form' && it.params && typeof it.params.draftId === 'string'
        ? it.params.draftId
        : it.title;
    const key = toKey([...base, seg]);
    // if this is the game-chests node, return a submenu provided via hookItems regardless of children
    if (isGameChestsNode(it)) {
      return {
        key,
        label: it.title,
        children: hookItems ?? [],
      } as AntMenuItem;
    }
    if (it.children && it.children.length) {
      return {
        key,
        label: it.title,
        children: buildItems(it.children, [...base, it.title], hookItems),
      } as AntMenuItem;
    }
    return { key, label: it.title } as AntMenuItem;
  });
}

export default function SidebarMenu({ menu, selectedMenuPath, onSelect }: SidebarMenuProps) {
  const chests = useDraftMenu({ schemaKey: 'ChestDescriptor' });

  const hookItems: MenuProps['items'] = (chests.loading && (!chests.items || chests.items.length === 0))
    ? [{ key: 'Game/Chests/loading', label: 'Loading…', disabled: true } as AntMenuItem]
    : (chests.items || []).map(c => ({ key: `Game/Chests/${c.params?.draftId ?? ''}`, label: c.title })) as MenuProps['items'];
  const items = buildItems(menu, [], hookItems as MenuProps['items']);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // keep openKeys in sync with selectedMenuPath prefixes, but avoid forcing changes that cause flicker
  useEffect(() => {
    if (!selectedMenuPath || selectedMenuPath.length <= 1) return;
    const prefixes: string[] = [];
    for (let i = 0; i < selectedMenuPath.length - 1; i++) prefixes.push(toKey(selectedMenuPath.slice(0, i + 1)));
    // Only update if different to avoid re-renders that toggle the menu
    const equal = prefixes.length === openKeys.length && prefixes.every((v, i) => v === openKeys[i]);
    if (!equal) setOpenKeys(prefixes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenuPath]);

  const handleSelect: MenuProps['onSelect'] = (info) => {
    const path = String(info.key).split("/");
    onSelect(path);
  // ensure we load chests when Game/Chests is selected or a child of it
  if (path.length >= 2 && path[0] === 'Game' && path[1] === 'Chests') chests.ensureLoaded();
  // also trigger when the selected key path includes the literal 'Game/Chests'
  if (String(info.key).includes('Game/Chests')) chests.ensureLoaded();
    // ensure parent is opened when explicitly selected
    if (path.length > 1) {
      const prefixes: string[] = [];
      for (let i = 0; i < path.length - 1; i++) prefixes.push(toKey(path.slice(0, i + 1)));
      setOpenKeys(prefixes);
      // if the selection is exactly ['Game','Chests'], open the submenu so items can appear
      if (path.length === 2 && path[0] === 'Game' && path[1] === 'Chests') {
        setOpenKeys([...prefixes, toKey(['Game']), toKey(['Game','Chests'])]);
      }
    }
  };

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    const next = keys as string[];
    // set open keys (controlled)
    setOpenKeys(next);
    // if Game/Chests branch was opened, trigger load
  if (next.includes('Game/Chests')) chests.ensureLoaded();
  };

  const selectedKeysArr: string[] = selectedMenuPath.length ? [toKey(selectedMenuPath)] : [];

  return (
    <>
      <Menu
        mode="inline"
        items={items}
        selectedKeys={selectedKeysArr}
        onSelect={handleSelect}
        onOpenChange={handleOpenChange}
        openKeys={openKeys}
  style={{ height: '100%', borderRight: 0 }}
      />
    </>
  );
}

