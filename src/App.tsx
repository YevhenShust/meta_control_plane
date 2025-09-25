import { useEffect, useState } from 'react';
import './styles/rjsf-layout.css';
import './styles/slate.css';
import SidebarMenu from "./components/sidebar/SidebarMenu";
import MainContent from "./components/MainContent";
import { menuStructure } from "./components/sidebar/menuStructure";
import { ConfigProvider, Layout } from "antd";
import slateTokens from './theme/slateTheme';
import { ThemeProvider, CssBaseline } from '@mui/material';
import muiTheme from './theme/muiTheme';
import "antd/dist/reset.css";
import "./App.css";
import Header from './components/Header';

const HEADER_H = 64;
const SIDER_W = 260;

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
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ConfigProvider theme={slateTokens}>
      <Layout className="app-layout" style={{ minHeight: '100vh' }}>
      {/* Fixed header on top */}
      <Layout.Header className="slate-header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_H,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
        }}
      >
        <Header />
      </Layout.Header>

      {/* Body under header */}
      <Layout>
        {/* Fixed sidebar under header */}
        <Layout.Sider
          width={SIDER_W}
          theme="dark"
          className="slate-sider"
          style={{
            position: 'fixed',
            top: HEADER_H,
            bottom: 0,
            left: 0,
            height: `calc(100vh - ${HEADER_H}px)`,
            overflow: 'auto',
          }}
        >
          <SidebarMenu
            menu={menuStructure}
            selectedMenuPath={selectedMenuPath}
            onSelect={setSelectedMenuPath}
          />
        </Layout.Sider>

        {/* Scrollable content area */}
        <Layout style={{ marginLeft: SIDER_W, paddingTop: HEADER_H }}>
          <Layout.Content className="slate-content"
            style={{
              height: `calc(100vh - ${HEADER_H}px)`,
              overflow: 'auto',
              padding: '16px 24px',
            }}
          >
            <MainContent selectedMenuPath={selectedMenuPath} />
          </Layout.Content>
        </Layout>
      </Layout>
    </Layout>
    </ConfigProvider>
    </ThemeProvider>
  );
};

export default App;
