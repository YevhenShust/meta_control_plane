import { useEffect, useState } from 'react';
import './styles/rjsf-layout.css';
import SidebarMenu from "./components/sidebar/SidebarMenu";
import MainContent from "./components/MainContent";
import { menuStructure } from "./components/sidebar/menuStructure";
import { Layout } from "antd";
import "antd/dist/reset.css";
import "./App.css";
import TopBar from './components/TopBar';
import CreateSetupModal from './components/CreateSetupModal';
import { createSetup, listSetups, type SetupDto } from './shared/api/setup';
import { uploadSchemaV1 } from './shared/api/schema';

const { Sider, Content, Header } = Layout;

const App: React.FC = () => {
  const [selectedMenuPath, setSelectedMenuPath] = useState<string[]>([]);
  const [setups, setSetups] = useState<SetupDto[]>([]);
  const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // On mount: read ?path= from URL and restore selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('path');
    if (raw) {
      try {
        const arr = raw.split('/').map((s) => decodeURIComponent(s));
        if (arr.length > 0) setSelectedMenuPath(arr);
      } catch {
        // ignore malformed
      }
    }

    const onPop = () => {
      const p = new URLSearchParams(window.location.search).get('path');
      if (!p) {
        setSelectedMenuPath([]);
        return;
      }
      try {
        const arr = p.split('/').map((s) => decodeURIComponent(s));
        setSelectedMenuPath(arr);
      } catch {
        setSelectedMenuPath([]);
      }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Update URL when selection changes
  useEffect(() => {
    const qp = selectedMenuPath.length ? '?path=' + encodeURIComponent(selectedMenuPath.join('/')) : '';
    window.history.pushState(null, '', qp || window.location.pathname + window.location.search.replace(/\?path=[^&]*/, ''));
  }, [selectedMenuPath]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[App] fetching setups…');
        const list = await listSetups();
        if (!mounted) return;
        console.log('[App] setups:', list);
        setSetups(list);
        if (!list.length) return;
        // if no selection yet, pick the first from the list
        setSelectedSetupId(prev => prev ?? ((list[0].id as string) ?? null));
      } catch (e) {
        console.error('[App] listSetups failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCreateClick = () => setCreateOpen(true);
  const handleCreateSubmit = async (name: string) => {
    try {
      setCreating(true);
      const created = await createSetup({ name });
      // upload default ChestDescriptor schema into the new setup
      try {
        const schema = {
          "$schema": "http://json-schema.org/draft-07/schema",
          "x-id": "ChestDescriptor",
          "allOf": [{ "$ref": "#/$defs/Entity" }],
          "type": "object",
          "properties": {
            "Type": { "$ref": "#/$defs/ChestType" },
            "InteractDistance": { "type": "integer" },
            "LockInteractTime": { "type": "string", "format": "TimeSpan", "default": "00:00:00" },
            "DropInfo": {
              "type": "object",
              "properties": {
                "Items": { "type": "array", "items": { "$ref": "#/$defs/itemInfo" } },
                "Currency": { "$ref": "#/$defs/Currency" },
                "CraftMaterials": { "type": "array", "items": { "$ref": "#/$defs/itemInfo" } }
              },
              "required": ["Items", "Currency", "CraftMaterials"]
            }
          },
          "$defs": {
            "itemInfo": { "type": "object", "properties": { "LootTable": { "type": "string" }, "DropPercent": { "type": "integer" } } },
            "Entity": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "Entity", "type": "object", "x-abstract": true, "properties": { "Id": { "type": "string" } }, "required": ["Id"] },
            "ChestType": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "ChestType", "enum": ["Common","Rare","Exotic","Epic"] },
            "Range": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "Range", "type": "object", "x-csharp-generic-parameter": "T", "properties": { "Min": { "x-csharp-generic-parameter": true }, "Max": { "x-csharp-generic-parameter": true } } },
            "Currency": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "Currency", "type": "object", "properties": { "Amount": { "$ref": "#/$defs/Range" }, "ExpiriencePercent": { "type": "integer" } } }
          },
          "required": ["LockInteractTime","DropInfo"]
        };
        await uploadSchemaV1(created.id as string, schema);
        console.log('[App] uploaded default ChestDescriptor schema for setup', created.id);
      } catch (e) {
        console.error('[App] uploadSchema failed', e);
      }
      // also upload ChestSpawn schema
      try {
        const spawnSchema = {
          "$schema": "http://json-schema.org/draft-07/schema",
          "x-id": "ChestSpawn",
          "allOf": [{ "$ref": "#/$defs/Entity" }],
          "type": "object",
          "properties": {
            "DescriptorId": { "type": "string" },
            "Position": { "$ref": "#/$defs/Vector3" },
            "Rotation": { "$ref": "#/$defs/Vector3" }
          },
          "required": ["Position"],
          "$defs": {
            "Entity": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "Entity", "type": "object", "x-abstract": true, "properties": { "Id": { "type": "string" } }, "required": ["Id"] },
            "LocationType": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "LocationType", "enum": ["World","Dungeon","Siege","Void","Arena"] },
            "Vector3": { "$schema": "https://json-schema.org/draft/2020-12/schema", "x-id": "Vector3", "type": "object", "properties": { "X": { "type": "number", "format": "float" }, "Y": { "type": "number", "format": "float" }, "Z": { "type": "number", "format": "float" } } }
          }
        };
        await uploadSchemaV1(created.id as string, spawnSchema);
        console.log('[App] uploaded default ChestSpawn schema for setup', created.id);
      } catch (e) {
        console.error('[App] uploadSpawnSchema failed', e);
      }
      const list = await listSetups();
      setSetups(list);
      setSelectedSetupId(created.id as string);
      setCreateOpen(false);
    } catch (e) {
      console.error('[App] createSetup failed', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ background: '#fff', padding: 0, borderBottom: '1px solid #eee' }}>
        <TopBar
          setups={setups.map(s => ({ id: s.id as string, name: (s.name as string) || (s.id as string) }))}
          selectedId={selectedSetupId}
          onChange={(id) => setSelectedSetupId(id)}
          onCreate={handleCreateClick}
        />
        <CreateSetupModal
          open={createOpen}
          loading={creating}
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleCreateSubmit}
        />
      </Header>
      <Layout>
        <Sider width={300} style={{ background: "#fff", borderRight: "1px solid #eee" }}>
          <SidebarMenu
            menu={menuStructure}
            selectedMenuPath={selectedMenuPath}
            onSelect={setSelectedMenuPath}
          />
        </Sider>
        <Layout>
          <Content style={{ padding: 24, background: "#fafafa" }}>
            
            <MainContent selectedMenuPath={selectedMenuPath} />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;