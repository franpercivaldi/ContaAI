import { Card, Typography, Space, Modal, InputNumber, message, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchOrganizationSummary, updateOrganizationInitialAmount } from '../features/invoices/api';
import { Organization } from '../../../../packages/shared-types/src';

type Props = { organization: Organization | '' };

export default function OrganizationSummaryCard({ organization }: Props) {
  const enabled = !!organization;
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['org-summary', organization],
    queryFn: () => fetchOrganizationSummary(organization as Organization),
    enabled,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    if (data?.initialAmount) setValue(Number(data.initialAmount));
  }, [data?.initialAmount]);

  const mutation = useMutation({
    mutationFn: (newAmount: number) => updateOrganizationInitialAmount(organization as Organization, newAmount),
    onSuccess: () => {
      queryClient.invalidateQueries(['org-summary', organization]);
      message.success('Monto inicial actualizado');
      setModalOpen(false);
    },
    onError: () => {
      message.error('Error al actualizar el monto inicial');
    },
  });

  if (!organization) return null;

  return (
    <>
      <Card style={{ background: 'var(--card-bg)', border: '1px solid var(--borders)', padding: 12, width: '100%', boxSizing: 'border-box' }}>
        <Space direction="vertical">
          <Typography.Text strong style={{ color: 'var(--text)' }}>
            Resumen {organization}
          </Typography.Text>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--muted)' }}>Monto inicial</div>
              <div style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div>${data?.initialAmount ?? '0.00'}</div>
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: 'var(--muted)' }} />}
                  onClick={() => {
                    setValue(Number(data?.initialAmount ?? 0));
                    setModalOpen(true);
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--muted)' }}>Monto total a pagar</div>
              <div style={{ color: 'var(--text)' }}>${data?.totalAmount ?? '0.00'}</div>
            </div>

            <div>
              <div style={{ color: 'var(--muted)' }}>Pagado</div>
              <div style={{ color: 'var(--text)' }}>${data?.totalPagado ?? '0.00'}</div>
            </div>

            <div>
              <div style={{ color: 'var(--muted)' }}>Saldo restante</div>
              <div style={{ color: 'var(--text)' }}>${data?.saldoRestante ?? '0.00'}</div>
            </div>
          </div>
        </Space>
      </Card>

      <Modal
        title="Editar Monto inicial"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => {
          const v = Number(value);
          if (!Number.isFinite(v) || v < 0) {
            message.error('Ingrese un número válido');
            return;
          }
          mutation.mutate(v);
        }}
        okText="Guardar"
      >
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          value={value}
          onChange={(v) => setValue(Number(v ?? 0))}
          formatter={(val) => `${val}`}
        />
      </Modal>
    </>
  );
}
