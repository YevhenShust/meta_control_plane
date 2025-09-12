import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useState } from "react";
import type { MenuItem } from "./menuStructure";

type SidebarMenuProps = {
  menu: MenuItem[];
  selectedMenuPath: string[];
  onSelect: (path: string[]) => void;
};

type AntMenuItem = NonNullable<MenuProps['items']>[number];

function toKey(path: string[]) {
  return path.join("/");
}

function buildItems(items: MenuItem[], base: string[] = []): NonNullable<MenuProps['items']> {
  return items.map((it) => {
    const key = toKey([...base, it.title]);
    if (it.children && it.children.length) {
      return {
        key,
        label: it.title,
    children: buildItems(it.children, [...base, it.title]),
      } as AntMenuItem;
    }
  return { key, label: it.title } as AntMenuItem;
  });
}

export default function SidebarMenu({ menu, selectedMenuPath, onSelect }: SidebarMenuProps) {
  const items = buildItems(menu);
  const selectedKey = selectedMenuPath.length ? toKey(selectedMenuPath) : undefined;
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
    // ensure parent is opened when explicitly selected
    if (path.length > 1) {
      const prefixes: string[] = [];
      for (let i = 0; i < path.length - 1; i++) prefixes.push(toKey(path.slice(0, i + 1)));
      setOpenKeys(prefixes);
    }
  };

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    const next = keys as string[];
    // set open keys (controlled)
    setOpenKeys(next);
  };

  return (
    <Menu
      mode="inline"
      items={items}
      selectedKeys={selectedKey ? [selectedKey] : []}
  onSelect={handleSelect}
  onOpenChange={handleOpenChange}
  openKeys={openKeys}
      style={{ height: '100%', borderRight: 0 }}
    />
  );
}
