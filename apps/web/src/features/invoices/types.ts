import { Organization } from '../../../../packages/shared-types/src';

export type InvoiceItem = {
  id: string;
  hash: string;

  tipo_factura: string | null;
  monto_iva: number | null;
  cuil: string;
  razon_social: string | null;
  condicion_iva: string | null;

  supplier_cuit: string;
  customer_cuit: string;
  punto_venta: number;
  numero: string;
  cae: string | null;
  fecha_emision: string;
  moneda: string;
  monto_total: number;
  estado_arca: 'VALIDA' | 'INVALIDA' | 'PENDIENTE' | 'ERROR';
  habilitada_pago: boolean;
  paid: boolean;
  organization: Organization;
  observaciones: string | null;
  file: {
    id: string;
    s3_key: string;
    mime: string;
    size: number;
    original_filename: string;
  } | null;
  created_at: string;
  updated_at: string;
};
