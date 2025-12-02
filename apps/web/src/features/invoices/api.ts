import api from '../../lib/api';
import { InvoicesResponse, InvoiceItem } from './types';
import { Organization } from '../../../../packages/shared-types/src';

export type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  estado_arca?: 'VALIDA' | 'INVALIDA' | 'PENDIENTE' | 'ERROR' | '';
  habilitada_pago?: '' | 'true' | 'false';
  organization?: Organization | '';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  sortBy?: 'fecha_emision' | 'monto_total' | 'created_at';
  sortDir?: 'asc' | 'desc';
};

export async function fetchInvoices(params: ListParams): Promise<InvoicesResponse> {
  const { data } = await api.get<InvoicesResponse>('/invoices', { params });
  return data;
}

export async function patchInvoice(id: string, body: Partial<Pick<InvoiceItem, 'habilitada_pago' | 'observaciones'>>): Promise<InvoiceItem> {
  const { data } = await api.patch<InvoiceItem>(`/invoices/${id}`, body);
  return data;
}

export async function patchInvoicePaid(id: string, paid: boolean): Promise<InvoiceItem> {
  const { data } = await api.patch<InvoiceItem>(`/invoices/${id}/paid`, { paid });
  return data;
}

export async function getInvoiceFileDownloadUrl(fileId: string): Promise<string> {
  const { data } = await api.get<{ url: string; expiresIn: number }>(`/files/${fileId}/presign`);
  return data.url;
}

export async function getInvoiceById(id: string): Promise<InvoiceItem> {
  const { data } = await api.get<InvoiceItem>(`/invoices/${id}`);
  return data;
}

export async function fetchOrganizationSummary(org: Organization) {
  const { data } = await api.get<{
    organization: string;
    initialAmount: string;
    totalAmount: string;
    totalPagado: string;
    saldoRestante: string;
  }>(`/invoices/summary`, { params: { organization: org } });
  return data;
}

export async function updateOrganizationInitialAmount(
  organization: Organization,
  initialAmount: string | number
) {
  const { data } = await api.patch(`/invoices/organization-budget`, { organization, initialAmount });
  return data;
}