import { useEffect, useRef, useState } from 'react';
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

const wroteOnce = useRef(false);

  useEffect(() => {
    if (!wroteOnce.current) {
      wroteOnce.current = true;
      return;
    }

    const url = new URL(window.location.href);
    if (selectedMenuPath.length) {
      const val = selectedMenuPath.map(s => encodeURIComponent(s)).join('/');
      url.searchParams.set('path', val);
    } else {
      url.searchParams.delete('path');
    }

    window.history.replaceState(null, '', url.toString());
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
