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