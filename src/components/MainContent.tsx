import EntityHost from './EntityHost';
import chestSpawnUi from '../ui/ChestSpawn.rjsf.uischema.json';
import { findNodeByPath, type MenuItem } from './sidebar/menuStructure.tsx';
import { Button, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SetupSelect from '../setup/SetupSelect';
import useSetups from '../setup/useSetups';


export default function MainContent({ selectedMenuPath }: { selectedMenuPath: string[] }) {
  const { selectedId, createSetup } = useSetups();

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
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#fff',
          padding: '8px 0',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          {/* left: title / breadcrumbs */}
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            {selectedMenuPath.join(' / ')}
          </div>

          {/* right: Setup + actions */}
          <Space align="center" size={8}>
            <SetupSelect />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={async () => {
                const name = prompt('Setup name');
                if (name) await createSetup(name);
              }}
            >
              New
            </Button>
            {selectedId && <Tag>{selectedId}</Tag>}
          </Space>
        </div>
      </div>

      {!node ? (
        <div>Вузол не знайдено</div>
      ) : (
        <EntityHost kind={node.kind} params={node.params} />
      )}
    </>
  );
}
