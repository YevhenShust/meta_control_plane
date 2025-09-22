import EntityHost from './EntityHost';
import { findNodeByPath, type MenuItem } from './sidebar/menuStructure.tsx';

export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  if (!selectedMenuPath || selectedMenuPath.length === 0) {
    return <div>Оберіть пункт меню</div>;
  }

  // If user selected the Game -> Chests branch (depth 2), render lightweight placeholder
  if (selectedMenuPath.length === 2 && selectedMenuPath[0] === 'Game' && selectedMenuPath[1] === 'Chests') {
    return <div style={{ padding: 8 }}>Select a chest</div>;
  }

  if (selectedMenuPath.length >= 3 && selectedMenuPath[0] === 'Game' && selectedMenuPath[1] === 'Chests') {
    const draftId = selectedMenuPath[2];
    return <EntityHost kind="chest-editor" params={{ entityId: draftId }} />;
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
