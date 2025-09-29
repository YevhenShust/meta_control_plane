import { useEffect, useState } from 'react';
import Header from './components/Header';
import SidebarMenuContainer from './components/sidebar/SidebarMenuContainer';
import MainContent from './components/MainContent';

// layout constants moved to CSS variables

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
    <div className="app-shell">
      <div>
        <Header />
      </div>
      <div className="app-body">
        <div className="app-sider">
          <SidebarMenuContainer selectedMenuPath={selectedMenuPath} onSelect={setSelectedMenuPath} />
        </div>
        <div className="app-main">
          <MainContent selectedMenuPath={selectedMenuPath} />
        </div>
      </div>
    </div>
  );
};

export default App;
