import React, { useEffect, useMemo, useState } from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import type { MenuItem } from './menuStructure';
import { useDraftMenu } from '../../menu/useDraftMenu';
import { isGameChestsNode } from './menuStructure';

type SidebarMenuProps = {
  menu: MenuItem[];
  selectedMenuPath: string[];
  onSelect: (path: string[]) => void;
};

function toKey(path: string[]) {
  return path.join('/');
}

// Render nodes recursively as MUI Lists
function renderNodes(
  items: MenuItem[],
  base: string[],
  openKeys: string[],
  onToggle: (key: string) => void,
  onSelect: (path: string[]) => void,
  chestsHookItems: { key: string; label: string }[] | null,
  chestsLoading: boolean
) {
  return items.map((it) => {
    const seg = it.kind === 'form' && it.params && typeof it.params.draftId === 'string' ? it.params.draftId : it.title;
    const path = [...base, seg];
    const key = toKey(path);
    const hasChildren = !!(it.children && it.children.length);

    // Game/Chests special case: show hook-provided children
    if (isGameChestsNode(it)) {
      const expanded = openKeys.includes(key);
      return (
        <div key={key}>
          <ListItemButton onClick={() => onToggle(key)} selected={expanded}>
            <ListItemText primary={it.title} />
          </ListItemButton>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {chestsLoading ? (
                <ListItemButton sx={{ pl: 4 }}>
                  <ListItemText primary={'Loading…'} />
                  <CircularProgress size={16} sx={{ ml: 1 }} />
                </ListItemButton>
              ) : chestsHookItems && chestsHookItems.length ? (
                chestsHookItems.map(ci => (
                  <ListItemButton key={ci.key} sx={{ pl: 4 }} onClick={() => onSelect(ci.key.split('/'))}>
                    <ListItemText primary={ci.label} />
                  </ListItemButton>
                ))
              ) : (
                <ListItemButton sx={{ pl: 4 }}>
                  <ListItemText primary={'(no items)'} />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </div>
      );
    }

    if (hasChildren) {
      const expanded = openKeys.includes(key);
      return (
        <div key={key}>
          <ListItemButton onClick={() => onToggle(key)} selected={expanded}>
            <ListItemText primary={it.title} />
          </ListItemButton>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {renderNodes(it.children ?? [], [...base, it.title], openKeys, onToggle, onSelect, chestsHookItems, chestsLoading)}
            </List>
          </Collapse>
        </div>
      );
    }

    return (
      <ListItemButton key={key} onClick={() => onSelect(path)}>
        <ListItemText primary={it.title} />
      </ListItemButton>
    );
  });
}

export default function SidebarMenuMaterial({ menu, selectedMenuPath, onSelect }: SidebarMenuProps) {
  const chests = useDraftMenu({ schemaKey: 'ChestDescriptor' });

  const chestsHookItems = useMemo(() => {
    if (chests.loading && (!chests.items || chests.items.length === 0)) return [];
    return (chests.items || []).map(c => ({ key: `Game/Chests/${c.params?.draftId ?? ''}`, label: c.title }));
  }, [chests.items, chests.loading]);

  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // When chests finish loading and the current selection is the Game/Chests branch
  // (no specific chest selected), auto-select the first chest so the form opens.
  useEffect(() => {
    if (!chests.loading && chests.items && chests.items.length > 0) {
      if (selectedMenuPath && selectedMenuPath.length === 2 && selectedMenuPath[0] === 'Game' && selectedMenuPath[1] === 'Chests') {
        const first = chests.items[0];
        if (first && first.params && typeof first.params.draftId === 'string') {
          const key = `Game/Chests/${first.params.draftId}`;
          console.info('[SidebarMenuMaterial] auto-selecting first chest ->', key);
          onSelect(key.split('/'));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chests.loading, chests.items]);

  // keep openKeys in sync with selectedMenuPath prefixes, but avoid forcing changes that cause flicker
  useEffect(() => {
    if (!selectedMenuPath || selectedMenuPath.length <= 1) return;
    const prefixes: string[] = [];
    for (let i = 0; i < selectedMenuPath.length - 1; i++) prefixes.push(toKey(selectedMenuPath.slice(0, i + 1)));
    const equal = prefixes.length === openKeys.length && prefixes.every((v, i) => v === openKeys[i]);
    if (!equal) setOpenKeys(prefixes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenuPath]);

  // If the app starts with selectedMenuPath pointing to Game/Chests (no id), ensure we load chests
  useEffect(() => {
    if (selectedMenuPath && selectedMenuPath.length === 2 && selectedMenuPath[0] === 'Game' && selectedMenuPath[1] === 'Chests') {
      chests.ensureLoaded();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (key: string) => {
    setOpenKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    if (key === 'Game/Chests') chests.ensureLoaded();
  };

  const handleSelect = (path: string[]) => {
    console.info('[SidebarMenuMaterial] selected path ->', path);
    onSelect(path);
    if (path.length >= 2 && path[0] === 'Game' && path[1] === 'Chests') chests.ensureLoaded();
    if (path.length > 1) {
      const prefixes: string[] = [];
      for (let i = 0; i < path.length - 1; i++) prefixes.push(toKey(path.slice(0, i + 1)));
      setOpenKeys(prefixes);
      if (path.length === 2 && path[0] === 'Game' && path[1] === 'Chests') setOpenKeys([...prefixes, toKey(['Game']), toKey(['Game','Chests'])]);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <List component="nav">
        {renderNodes(menu, [], openKeys, handleToggle, handleSelect, chestsHookItems.length ? chestsHookItems : null, chests.loading)}
      </List>
      <Divider />
    </div>
  );
}
