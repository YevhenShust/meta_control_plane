import React, { useState, useEffect } from "react";
import './styles/rjsf-layout.css';
import SidebarMenu from "./components/sidebar/SidebarMenu";
import MainContent from "./components/MainContent";
import { menuStructure } from "./components/sidebar/menuStructure";
import { Layout } from "antd";
import "antd/dist/reset.css";
import "./App.css";

const { Sider, Content } = Layout;

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
    const qp = selectedMenuPath.length ? '?path=' + encodeURIComponent(selectedMenuPath.join('/')) : '';
    window.history.pushState(null, '', qp || window.location.pathname + window.location.search.replace(/\?path=[^&]*/, ''));
  }, [selectedMenuPath]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
  );
};

export default App;
