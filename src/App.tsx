import { useEffect, useState } from 'react';
import Header from './components/Header';
import { Card } from '@blueprintjs/core';
import SidebarMenuContainer from './components/sidebar/SidebarMenuContainer';
import MainContent from './components/MainContent';

const App: React.FC = () => {
  const [selectedMenuPath, setSelectedMenuPath] = useState<string[]>([]);

  useEffect(() => {
    const readPath = () => {
      const p = new URLSearchParams(window.location.search).get('path') || '';
      if (!p) return setSelectedMenuPath([]);
      try {
        setSelectedMenuPath(p.split('/').map(s => decodeURIComponent(s)));
      } catch {
        setSelectedMenuPath([]);
      }
    };

    readPath();
    const onPop = () => readPath();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const qp = selectedMenuPath.length ? `?path=${encodeURIComponent(selectedMenuPath.join('/'))}` : '';
    const cleaned = window.location.search.replace(/\?path=[^&]*/, '');
    window.history.pushState(null, '', qp || window.location.pathname + cleaned);
  }, [selectedMenuPath]);

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Card elevation={1} className="sider-card">
          <SidebarMenuContainer selectedMenuPath={selectedMenuPath} onSelect={setSelectedMenuPath} />
        </Card>
        <Card elevation={1} className="main-card">
          <MainContent selectedMenuPath={selectedMenuPath} />
        </Card>
      </div>
    </div>
  );
};

export default App;
