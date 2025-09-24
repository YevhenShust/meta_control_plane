import EntityHost from './EntityHost';
import chestSpawnUi from '../ui/ChestSpawn.rjsf.uischema.json';
import { findNodeByPath, type MenuItem } from './sidebar/menuStructure.tsx';

export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  if (!selectedMenuPath || selectedMenuPath.length === 0) {
    return <div>Оберіть пункт меню</div>;
  }

  // If user selected the Game -> Chests branch (depth 2), render lightweight placeholder
  if (selectedMenuPath.length === 2 && selectedMenuPath[0] === 'Game' && selectedMenuPath[1] === 'Chests') {
    return <div style={{ padding: 8 }}>Select a chest</div>;
  }

  // Atlas -> Location -> Chests should open a read-only table view
  if (selectedMenuPath.length >= 3
      && selectedMenuPath[0] === 'Atlas'
      && selectedMenuPath[1] === 'Location'
      && selectedMenuPath[2] === 'Chests') {
    return <EntityHost kind="table" params={{ schemaKey: 'ChestSpawn', uiSchema: chestSpawnUi }} />;
  }

  if (selectedMenuPath.length >= 3 && selectedMenuPath[0] === 'Game' && selectedMenuPath[1] === 'Chests') {
    const draftId = selectedMenuPath[2];
    return <EntityHost key={draftId} kind="form" params={{ schemaKey: 'ChestDescriptor', draftId }} />;
  }

  const node = findNodeByPath(selectedMenuPath) as MenuItem | null;

  return (
    <>
      {!node ? (
        <div>Вузол не знайдено</div>
      ) : (
        <EntityHost kind={node.kind} params={node.params} />
      )}
    </>
  );
}
