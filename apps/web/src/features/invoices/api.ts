import api from '../../lib/api';
import { InvoicesResponse, InvoiceItem } from './types';

export type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  estado_arca?: 'VALIDA' | 'INVALIDA' | 'PENDIENTE' | 'ERROR' | '';
  habilitada_pago?: '' | 'true' | 'false';
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

export async function getInvoiceFileDownloadUrl(fileId: string): Promise<string> {
  const { data } = await api.get<{ url: string; expiresIn: number }>(`/files/${fileId}/presign`);
  return data.url;
}

export async function getInvoiceById(id: string): Promise<InvoiceItem> {
  const { data } = await api.get<InvoiceItem>(`/invoices/${id}`);
  return data;
}