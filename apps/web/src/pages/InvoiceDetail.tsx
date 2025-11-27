import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Descriptions, Tag, Space, Button, Typography, Input, message } from 'antd';
import { getInvoiceById, patchInvoice, getInvoiceFileDownloadUrl } from '../features/invoices/api';
import { getUser } from '../lib/auth';
import type { InvoiceItem } from '../features/invoices/types';

const { TextArea } = Input;

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    enabled: !!id,
    queryFn: () => getInvoiceById(id!),
  });

  const obsMutation = useMutation({
    mutationFn: (obs: string | null) => patchInvoice(id!, { observaciones: obs }),
    onSuccess: (updated) => {
      message.success('Observaciones guardadas');
      qc.setQueryData<InvoiceItem>(['invoice', id], updated);
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error?.message || 'Error guardando'),
  });

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => getInvoiceFileDownloadUrl(fileId),
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (e: any) => message.error(e?.response?.data?.error?.message || 'Error obteniendo enlace'),
  });

  if (!id) return <div>Sin ID</div>;
  if (isLoading || !data) return <div>Cargando...</div>;

  const inv = data;

  const handleSaveObs = () => {
    obsMutation.mutate(inv.observaciones ?? '');
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0, color: 'var(--text)' }}>
          Factura {inv.punto_venta}-{inv.numero}
        </Typography.Title>
        <Button onClick={() => nav(-1)}>Volver</Button>
      </Space>

      <Card style={{ background: 'var(--card-bg)', border: '1px solid var(--borders)', color: 'var(--text)' }}>
        <Descriptions column={3} size="small" bordered>
            <Descriptions.Item label="Fecha">
            {inv.fecha_emision}
            </Descriptions.Item>

            <Descriptions.Item label="Tipo factura">
                {inv.tipo_factura || '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Número">
                {inv.punto_venta}-{inv.numero}
            </Descriptions.Item>

            <Descriptions.Item label="Razón social">
                {inv.razon_social || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="CUIL">
                {inv.cuil}
            </Descriptions.Item>
            <Descriptions.Item label="Condición IVA">
                {inv.condicion_iva || '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Monto IVA">
                {inv.monto_iva != null
                ? `${inv.moneda} ${inv.monto_iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Monto Total">
                {`${inv.moneda} ${inv.monto_total.toLocaleString('es-AR', {
                minimumFractionDigits: 2
                })}`}
            </Descriptions.Item>
            <Descriptions.Item label="Estado ARCA">
                {
                  (() => {
                    const v = inv.estado_arca;
                    const cls = v === 'PENDIENTE' ? 'pending' : v === 'VALIDA' ? 'ok' : (v === 'INVALIDA' || v === 'ERROR') ? 'disabled' : 'neutral';
                    return <span className={`chip chip-${cls}`}>{v}</span>;
                  })()
                }
            </Descriptions.Item>
            <Descriptions.Item label="Pago">
              <span className={`chip ${inv.habilitada_pago ? 'chip-ok' : 'chip-disabled'}`}>{inv.habilitada_pago ? 'Habilitada' : 'No habilitada'}</span>
            </Descriptions.Item>

            <Descriptions.Item label="CAE">
                {inv.cae || '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Archivo">
                {inv.file ? (
                <Space>
                    <span>{inv.file.original_filename}</span>
                    <Button
                    size="small"
                    onClick={() => downloadMutation.mutate(inv.file!.id)}
                    loading={downloadMutation.isPending}
                    >
                    Descargar
                    </Button>
                </Space>
                ) : (
                '—'
                )}
            </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Observaciones" style={{ background: 'var(--card-bg)', border: '1px solid var(--borders)', color: 'var(--text)' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            rows={4}
            value={inv.observaciones ?? ''}
            onChange={(e) =>
              qc.setQueryData<InvoiceItem>(['invoice', id], {
                ...inv,
                observaciones: e.target.value,
              })
            }
            disabled={!isAdmin || obsMutation.isPending}
            placeholder={isAdmin ? 'Notas internas de contabilidad...' : 'Solo lectura'}
          />
          {isAdmin && (
            <Button
              type="primary"
              onClick={handleSaveObs}
              loading={obsMutation.isPending}
            >
              Guardar
            </Button>
          )}
          {!isAdmin && (
            <Typography.Text type="secondary">
              Solo un administrador puede editar las observaciones.
            </Typography.Text>
          )}
        </Space>
      </Card>
    </Space>
  );
}
