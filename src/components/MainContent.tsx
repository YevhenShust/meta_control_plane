import EntityHost from './EntityHost';
import { findNodeByPath, type MenuItem } from './sidebar/menuStructure';
import JsonFormsDemoChest from '../dev/JsonFormsDemoChest';

export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search);
  if (params.get('demo') === 'jsonforms') {
    return <JsonFormsDemoChest />; // show demo only
  }
  if (!selectedMenuPath || selectedMenuPath.length === 0) {
    return <div>Оберіть пункт меню</div>;
  }

  const node = findNodeByPath(selectedMenuPath) as MenuItem | null;

  if (!node) {
    return <div>Вузол не знайдено</div>;
  }

  // If the game-chests branch is selected but no specific chest is chosen, show a lightweight placeholder
  if (node.kind === 'game-chests' && selectedMenuPath.length < 3) {
  return <div style={{ padding: 8 }}>Оберіть chest у підменю</div>;
  }

  return <EntityHost kind={node.kind} params={node.params} />;
}
