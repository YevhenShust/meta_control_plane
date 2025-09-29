import EntityHost from './EntityHost';
import type { MenuItem } from './sidebar/menuStructure';
import { dynamicRoutes, findNodeByPath } from './sidebar/menuStructure';

export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  if (!selectedMenuPath || selectedMenuPath.length === 0) {
    return <div>Оберіть пункт меню</div>;
  }

  const node = findNodeByPath(selectedMenuPath) as MenuItem | null;

  if (!node) return <div className="content-padding text-danger">Вузол не знайдено</div>;

  // If the selected path is exactly a dynamic form base (e.g. "Game/Chests") and no id segment was chosen, show a neutral placeholder
  const full = selectedMenuPath.join('/');
  const dyn = dynamicRoutes[full];
  if (dyn && dyn.kind === 'form' && selectedMenuPath.length === full.split('/').length) {
    return <div className="content-padding">Оберіть елемент у підменю</div>;
  }

  return <EntityHost kind={node.kind} params={node.params} />;
}
