import { Layout, Button } from 'antd';
import { IconToggleDark, IconToggleLight, IconLogout } from './components/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from './lib/auth';
import './styles/global.css';
import { useEffect, useState, useRef } from 'react';

const { Header, Content } = Layout;

export default function App() {
  const nav = useNavigate();
  const user = getUser();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const v = localStorage.getItem('theme');
      return v === 'dark' ? 'dark' : 'light';
    } catch { return 'light'; }
  });

  // Auto theme cycle: when enabled, toggles theme automatically every intervalMs.
  const [autoTheme, setAutoTheme] = useState<boolean>(() => {
    try { return localStorage.getItem('themeAuto') === '1'; } catch { return false; }
  });
  const autoRef = useRef<number | null>(null);
  const intervalMs = 8000; // 8s cycle (feel free to tweak)

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') body.classList.add('dark'); else body.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem('themeAuto', autoTheme ? '1' : '0'); } catch {}

    // Respect users who prefer reduced motion: don't auto-toggle.
    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (autoRef.current) {
      window.clearInterval(autoRef.current);
      autoRef.current = null;
    }
    if (autoTheme && !prefersReduce) {
      // Start cycling
      autoRef.current = window.setInterval(() => {
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
      }, intervalMs);
    }
    return () => {
      if (autoRef.current) { window.clearInterval(autoRef.current); autoRef.current = null; }
    };
  }, [autoTheme]);

  const logout = () => {
    clearSession();
    nav('/login');
  };

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <div className="app-header-left">
          <div className="brand-icon">CI</div>
          <div style={{fontSize:14}}>Estudio Contable</div>
        </div>

        <div className="app-header-right">
          <div className="app-user-email">{user?.email}</div>
          <div className="app-avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
          <Button size="small" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'dark' ? <IconToggleLight/> : <IconToggleDark/>}
          </Button>
          <Button size="small" type={autoTheme ? 'primary' : 'text'} onClick={() => setAutoTheme((a) => !a)} title="Auto theme">
            Auto
          </Button>
          <Button size="small" type="text" className="logout-btn" onClick={logout} title="Salir">
            <IconLogout/>
          </Button>
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <div className="app-container">
          <div className="app-content">
            <Outlet />
          </div>
        </div>
      </Content>
    </Layout>
  );
}
