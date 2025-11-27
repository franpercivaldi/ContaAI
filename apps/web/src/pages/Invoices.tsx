import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Table, Tag, Space, Button, Input, Select, DatePicker, message, Popconfirm, Flex, Typography } from 'antd';
import { IconDownload, IconEye, IconEnable } from '../components/icons';
import PdfPreviewModal from '../components/PdfPreviewModal';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { fetchInvoices, patchInvoice, ListParams, getInvoiceFileDownloadUrl } from '../features/invoices/api';
import { InvoiceItem } from '../features/invoices/types';
import { getUser } from '../lib/auth';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';


const { RangePicker } = DatePicker;

export default function Invoices() {
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  const nav = useNavigate();

  // Estado UI de filtros/paginación
  const [params, setParams] = useState<ListParams>({
    page: 1,
    pageSize: 10,
    q: '',
    estado_arca: '',
    habilitada_pago: '',
    sortBy: 'fecha_emision',
    sortDir: 'desc'
  });
  const [dates, setDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => fetchInvoices({
      ...params,
      dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
      dateTo: dates?.[1]?.format('YYYY-MM-DD'),
      estado_arca: params.estado_arca || undefined,
      habilitada_pago: params.habilitada_pago || undefined
    }),
    keepPreviousData: true
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) => patchInvoice(id, { habilitada_pago: next }),
    onSuccess: () => {
      message.success('Actualizado');
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error?.message || 'Error actualizando')
  });

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => getInvoiceFileDownloadUrl(fileId),
    onSuccess: (url) => {
      // previously opened in new tab; now handled by preview flow in component
    },
    onError: (e: any) => message.error(e?.response?.data?.error?.message || 'Error obteniendo enlace')
  });

  // PDF preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | undefined>(undefined);

  const openPdfPreview = async (fileId: string, filename?: string) => {
    try {
      const url = await getInvoiceFileDownloadUrl(fileId);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Error fetching file');
      const blob = await resp.blob();
      const obj = URL.createObjectURL(blob);
      setPreviewBlobUrl(obj);
      setPreviewName(filename);
      setPreviewOpen(true);
    } catch (e: any) {
      message.error(e?.message || 'No se pudo abrir vista previa');
    }
  };

  const columns: ColumnsType<InvoiceItem> = useMemo(() => {
    return [
      { title: 'Fecha', dataIndex: 'fecha_emision', key: 'fecha', width: 110 },

      { title: 'Razón social', dataIndex: 'razon_social', key: 'razon_social', width: 200 },
      { title: 'CUIL', dataIndex: 'cuil', key: 'cuil', width: 140 },
      { title: 'Cond. IVA', dataIndex: 'condicion_iva', key: 'cond_iva', width: 140 },

      { title: 'Tipo', dataIndex: 'tipo_factura', key: 'tipo_factura', width: 80 },
      { title: 'Pto Vta', dataIndex: 'punto_venta', key: 'pto_vta', width: 90 },
      { title: 'N° Factura', dataIndex: 'numero', key: 'numero', width: 120 },

      {
        title: 'Monto IVA',
        dataIndex: 'monto_iva',
        key: 'monto_iva',
        align: 'right',
        render: (v: number | null, r) =>
          v != null
            ? `${r.moneda} ${v.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            : '—',
        width: 140
      },
      {
        title: 'Monto Total',
        dataIndex: 'monto_total',
        key: 'monto_total',
        align: 'right',
        render: (v: number, r) =>
          `${r.moneda} ${v.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        width: 150
      },

      {
        title: 'ARCA',
        dataIndex: 'estado_arca',
        key: 'arca',
        render: (v: InvoiceItem['estado_arca']) => {
          const cls = v === 'PENDIENTE' ? 'pending' : v === 'VALIDA' ? 'ok' : (v === 'INVALIDA' || v === 'ERROR') ? 'disabled' : 'neutral';
          return <span className={`chip chip-${cls}`}>{v}</span>;
        },
        width: 120
      },
      {
        title: 'Pago',
        dataIndex: 'habilitada_pago',
        key: 'pago',
        render: (v: boolean) => (
          <span className={`chip ${v ? 'chip-ok' : 'chip-disabled'}`}>{v ? 'Habilitada' : 'No habilitada'}</span>
        ),
        width: 130
      },
      {
        title: 'Archivo',
        key: 'file',
        width: 220,
        render: (_, r) =>
          r.file ? (
            <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span title={r.file.original_filename}>{r.file.original_filename}</span>
            </div>
          ) : (
            '—'
          )
      },
      {
        title: 'Acciones',
        key: 'actions',
        fixed: 'right',
        width: 220,
          render: (_, r) => (
            <div className="center-buttons vertical">
            <Button size="small" onClick={() => nav(`/facturas/${r.id}`)}>
              <IconEye /> Ver
            </Button>
            {r.file && (
              <Button size="small" onClick={() => openPdfPreview(r.file!.id, r.file?.original_filename)} loading={downloadMutation.isPending}>
                <IconDownload /> Descargar
              </Button>
            )}
            {isAdmin && (
              <Popconfirm
                title={r.habilitada_pago ? 'Deshabilitar pago?' : 'Habilitar pago?'}
                onConfirm={() => toggleMutation.mutate({ id: r.id, next: !r.habilitada_pago })}
              >
                <Button size="small" loading={toggleMutation.isPending}>
                  <IconEnable /> {r.habilitada_pago ? 'Deshabilitar' : 'Habilitar'}
                </Button>
              </Popconfirm>
            )}
          </div>
        )
      }
    ];
  }, [isAdmin, toggleMutation, downloadMutation, nav]);


  const pagination: TablePaginationConfig = {
    current: params.page,
    pageSize: params.pageSize,
    total: data?.total || 0,
    showSizeChanger: true,
    onChange: (page, pageSize) => setParams((p) => ({ ...p, page, pageSize }))
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Flex gap={12} wrap>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography.Text style={{ marginBottom: 6, color: 'var(--text)' }} strong>
            Buscar
          </Typography.Text>
          <Input
            placeholder="Buscar por CUIT, número o CAE"
            style={{ width: 260 }}
            value={params.q}
            onChange={(e) => setParams((p) => ({ ...p, page: 1, q: e.target.value }))}
            allowClear
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography.Text style={{ marginBottom: 6, color: 'var(--text)' }} strong>
            ARCA
          </Typography.Text>
          <Select
            placeholder="Estado ARCA"
            style={{ width: 180 }}
            value={params.estado_arca}
            onChange={(v) => setParams((p) => ({ ...p, page: 1, estado_arca: v as any }))}
            options={[
              { value: '', label: 'Todos' },
              { value: 'VALIDA', label: 'VALIDA' },
              { value: 'INVALIDA', label: 'INVALIDA' },
              { value: 'PENDIENTE', label: 'PENDIENTE' },
              { value: 'ERROR', label: 'ERROR' }
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography.Text style={{ marginBottom: 6, color: 'var(--text)' }} strong>
            Pago
          </Typography.Text>
          <Select
            placeholder="Pago"
            style={{ width: 160 }}
            value={params.habilitada_pago}
            onChange={(v) => setParams((p) => ({ ...p, page: 1, habilitada_pago: v as any }))}
            options={[
              { value: '', label: 'Todas' },
              { value: 'true', label: 'Habilitadas' },
              { value: 'false', label: 'No habilitadas' }
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography.Text style={{ marginBottom: 6, color: 'var(--text)' }} strong>
            Fecha
          </Typography.Text>
          <RangePicker
            value={dates as any}
            onChange={(v) => { setDates(v as any); setParams((p) => ({ ...p, page: 1 })); }}
            allowEmpty={[true, true]}
          />
        </div>
        <Typography.Text type="secondary" style={{ alignSelf: 'center' }}>
          {data?.total ?? 0} resultados
        </Typography.Text>
      </Flex>

      <Table<InvoiceItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.items || []}
        columns={columns}
        pagination={pagination}
        scroll={{ x: 980 }}
      />

      <PdfPreviewModal
        open={previewOpen}
        blobUrl={previewBlobUrl}
        fileName={previewName}
        onClose={() => {
          setPreviewOpen(false);
          if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
          setPreviewBlobUrl(null);
          setPreviewName(undefined);
        }}
      />
    </Space>
  );
}
