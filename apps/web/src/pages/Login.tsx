import { Card, Form, Input, Button, Typography, message } from 'antd';
import api from '../lib/api';
import { saveSession } from '../lib/auth';
import { useLocation, useNavigate } from 'react-router-dom';

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
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Card title="Ingresar" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email: 'admin@demo.local', password: 'admin1234' }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="tuemail@dominio.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Entrar
            </Button>
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            ¿No tenés cuenta? <a href="/register">Registrate</a>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
