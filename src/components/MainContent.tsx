import EntityHost from './EntityHost';
import { findNodeByPath, type MenuItem } from './sidebar/menuStructure.tsx';

export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  if (!selectedMenuPath || selectedMenuPath.length === 0) {
    return <div>Оберіть пункт меню</div>;
  }

  const node = findNodeByPath(selectedMenuPath) as MenuItem | null;

  return (
    <div>
      <h2>{selectedMenuPath.join(' / ')}</h2>
      {!node ? (
        <div>Вузол не знайдено</div>
      ) : (
        <EntityHost kind={node.kind} params={node.params} />
      )}
    </div>
  );
}
