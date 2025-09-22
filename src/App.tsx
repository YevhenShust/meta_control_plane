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
import useSetups from './setup/useSetups';

const { Sider, Content, Header } = Layout;

const App: React.FC = () => {
  const [selectedMenuPath, setSelectedMenuPath] = useState<string[]>([]);
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
    const qp = selectedMenuPath.length
      ? '?path=' + encodeURIComponent(selectedMenuPath.join('/'))
      : '';
    const cleaned = window.location.search.replace(/\?path=[^&]*/, '');
    window.history.pushState(null, '', qp || window.location.pathname + cleaned);
  }, [selectedMenuPath]);

  const { createSetup } = useSetups();

  const handleCreateSubmit = async (name: string) => {
    try {
      setCreating(true);
      await createSetup(name);
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
        <TopBar />
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
