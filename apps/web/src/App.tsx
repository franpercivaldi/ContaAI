import { Layout, Button } from 'antd';
import { IconToggleDark, IconToggleLight, IconLogout } from './components/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from './lib/auth';
import './styles/global.css';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') body.classList.add('dark'); else body.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const logout = () => {
    clearSession();
    nav('/login');
  };

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontWeight: 600 }}>Estudio Contable</div>

        <div className="header-center">
          <div className="center-buttons">
            <Button onClick={toggleTheme} type="default">
              {theme === 'dark' ? <><IconToggleLight/> Modo claro</> : <><IconToggleDark/> Modo oscuro</>}
            </Button>
            <Button type="primary" onClick={logout}><IconLogout/> Salir</Button>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <span>{user?.email}</span>
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
