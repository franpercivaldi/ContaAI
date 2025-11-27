import { Card, Form, Input, Button, Typography, message } from 'antd';
import api from '../lib/api';
import { saveSession } from '../lib/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import loginImg from '../public/login.jpg';

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;

  const onFinish = async (values: any) => {
    try {
      const { data } = await api.post('/auth/login', values);
      saveSession(data);
      message.success('Bienvenido');
      const redirectTo = loc.state?.from?.pathname || '/';
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      message.error(e?.response?.data?.error?.message || 'Credenciales inválidas');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left" style={{ backgroundImage: `url(${loginImg})` }}>
        <div className="hero">
          <h1>ContaAI</h1>
          <p>Automatizá tu estudio contable con IA</p>
          <p>Centralizá facturas, ARCA y reportes en un solo lugar</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-brand">
          <div className="logo-icon">AI</div>
          <div className="logo-text">ContaAI</div>
        </div>
        <Card className="auth-card">
          <h2>Ingresar</h2>
          <p className="auth-subtitle">Usá tu correo del estudio para iniciar sesión</p>
          <Form layout="vertical" onFinish={onFinish} initialValues={{ email: 'admin@demo.local', password: 'admin1234' }}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }] }>
              <Input placeholder="tuemail@dominio.com" />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }] }>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Entrar
              </Button>
            </Form.Item>
            <Typography.Paragraph type="secondary" className="auth-footer-link">
              ¿No tenés cuenta? <a href="/register">Registrate</a>
            </Typography.Paragraph>
          </Form>
        </Card>
      </div>
    </div>
  );
}
