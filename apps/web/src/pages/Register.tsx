import { Card, Form, Input, Button, Typography, message } from 'antd';
import api from '../lib/api';
import { saveSession } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

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
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Card title="Crear cuenta" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="tuemail@dominio.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item name="confirm" label="Repetir contraseña" dependencies={['password']} rules={[
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
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            ¿Ya tenés cuenta? <a href="/login">Ingresar</a>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
