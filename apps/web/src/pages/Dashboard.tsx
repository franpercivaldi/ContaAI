import { Typography } from 'antd';

export default function Dashboard() {
  return (
    <div>
      <Typography.Title level={3}>Dashboard</Typography.Title>
      <Typography.Paragraph>
        Login listo. Próximo paso: tabla de facturas para Admin/Usuario.
      </Typography.Paragraph>
    </div>
  );
}
