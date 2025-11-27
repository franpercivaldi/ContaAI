import { Card, Form, Input, Button, Typography, message } from 'antd';
import api from '../lib/api';
import { saveSession } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import registerImg from '../public/register.jpg';

export default function Register() {
  const nav = useNavigate();

  const onFinish = async (values: any) => {
    try {
      const { data } = await api.post('/auth/register', { email: values.email, password: values.password });
      saveSession(data);
      message.success('Registro exitoso');
      nav('/');
    } catch (e: any) {
      message.error(e?.response?.data?.error?.message || 'Error registrando');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-right">
        <div className="auth-brand">
          <div className="logo-icon">AI</div>
          <div className="logo-text">ContaAI</div>
        </div>
        <Card className="auth-card">
          <h2>Crear cuenta</h2>
          <p className="auth-subtitle">Usá tu correo del estudio para registrarte</p>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }] }>
              <Input placeholder="tuemail@dominio.com" />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }] }>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Form.Item name="confirm" label="Repetir contraseña" dependencies={["password"]} rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                }
              })
            ]}>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Registrarme
              </Button>
            </Form.Item>
            <Typography.Paragraph type="secondary" className="auth-footer-link">
              ¿Ya tenés cuenta? <a href="/login">Ingresar</a>
            </Typography.Paragraph>
          </Form>
        </Card>
      </div>

      <div className="auth-left" style={{ backgroundImage: `url(${registerImg})` }}>
        <div className="hero">
          <h1>ContaAI</h1>
          <p>Automatizá tu estudio contable con IA</p>
          <p>Centralizá facturas, ARCA y reportes en un solo lugar</p>
        </div>
      </div>
    </div>
  );
}
