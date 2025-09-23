import { useEffect, useState } from 'react';
import './styles/rjsf-layout.css';
import SidebarMenu from "./components/sidebar/SidebarMenu";
import MainContent from "./components/MainContent";
import { menuStructure } from "./components/sidebar/menuStructure";
import { Layout } from "antd";
import "antd/dist/reset.css";
import "./App.css";
// setup hook not needed in this file

const App: React.FC = () => {
  const [selectedMenuPath, setSelectedMenuPath] = useState<string[]>([]);
  

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

  

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Layout.Sider
        width={260}
        theme="light"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
        }}
      >
        <SidebarMenu
          menu={menuStructure}
          selectedMenuPath={selectedMenuPath}
          onSelect={setSelectedMenuPath}
        />
      </Layout.Sider>

      <Layout style={{ marginLeft: 260, background: '#fff', minHeight: '100vh' }}>
        <Layout.Content style={{ padding: '16px 24px' }}>
          <MainContent selectedMenuPath={selectedMenuPath} />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default App;
