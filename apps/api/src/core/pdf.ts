// apps/api/src/core/pdf.ts
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import { s3, bucket } from './files.js';

const require = createRequire(import.meta.url);
// pdf2json es CommonJS, lo cargamos con require
const PdfParser = require('pdf2json');

/**
 * Descarga un PDF desde S3 y devuelve su contenido como Buffer.
 */
async function getPdfBufferFromS3(s3Key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key
    })
  );

  const body = res.Body;
  if (!body) {
    throw new Error(`Empty body for S3 key ${s3Key}`);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as any as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Convierte el PDF (buffer) a texto plano usando pdf2json.
 */
async function extractTextWithPdf2json(buffer: Buffer): Promise<string> {
  return await new Promise((resolve, reject) => {
    const pdfParser = new PdfParser();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(errData.parserError || errData);
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const pages = pdfData.Pages || [];
        const lines: string[] = [];

        for (const page of pages) {
          const texts = page.Texts || [];
          let line = '';

          for (const t of texts) {
            const runs = t.R || [];
            if (runs[0] && runs[0].T) {
              let raw = runs[0].T;
              let decoded = raw;

              // 🔥 FIX: intentar decodear; si falla, usar sin decodear
              try {
                decoded = decodeURIComponent(raw);
              } catch (_) {
                decoded = raw; // usar texto tal cual si no está encoded
              }

              line += decoded + ' ';
            }
          }

          lines.push(line.trim());
        }

        resolve(lines.join('\n'));
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}



export type ParsedInvoiceFields = {
  tipoFactura?: string;
  puntoVenta?: number;
  numeroComprobante?: number;
  condicionIva?: string;
  razonSocialCliente?: string;
  razonSocialEmisor?: string;
  cuitCliente?: string;
  cuitEmisor?: string;
  fechaEmision?: string; // YYYY-MM-DD
  montoIva?: number;
  montoTotal?: number;
};

/**
 * Convierte números tipo "1.693.734,16" → 1693734.16
 */
function parseArgAmount(str: string | undefined | null): number | undefined {
  if (!str) return undefined;
  const cleaned = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parser básico para facturas AFIP (como el ejemplo que nos pasaste).
 */
export function parseAfipInvoiceText(rawText: string): ParsedInvoiceFields {
  const result: ParsedInvoiceFields = {};

  // Normalizamos saltos de línea
  const t = rawText.replace(/\r\n/g, '\n');

  // 1) Tipo de factura (A/B/C, código AFIP)
  const tipoMatch = t.match(/FACTURA\s+([A-Z])\s+COD\.\s*(\d+)/i);
  if (tipoMatch) {
    result.tipoFactura = tipoMatch[1].toUpperCase();
  }

  // 2) Punto de venta y número de comprobante
  const pvMatch = t.match(/Punto de Venta:\s*Comp\. Nro:0*(\d+)\s+0*(\d+)/i);
  if (pvMatch) {
    result.puntoVenta = Number(pvMatch[1]);
    result.numeroComprobante = Number(pvMatch[2]);
  }

  // 3) Fecha de emisión
  let fechaMatch = t.match(/Fecha de Emisi[oó]n:?[^\n]*(\d{2}\/\d{2}\/\d{4})/i);
  if (!fechaMatch) {
    fechaMatch = t.match(/(\d{2}\/\d{2}\/\d{4})/);
  }
  if (fechaMatch) {
    const [dd, mm, yyyy] = fechaMatch[1].split('/');
    result.fechaEmision = `${yyyy}-${mm}-${dd}`;
  }

  // 4) CUITs
  const cuitMatches = [...t.matchAll(/CUIT:\s*(\d{11})/g)].map(m => m[1]);
  if (cuitMatches.length > 0) {
    result.cuitCliente = cuitMatches[0];
    result.cuitEmisor = cuitMatches[cuitMatches.length - 1];
  }

  // 5) Razón social emisor
  const razonEmisor = t.match(/Raz[oó]n Social:\s*\n([^\n]+)/i);
  if (razonEmisor) {
    result.razonSocialEmisor = razonEmisor[1].trim();
  }

  // 6) Razón social cliente
  const razonCliente =
    t.match(/Apellido y Nombre ?\/ ?Raz[oó]n Social:\s*([^\n]+)/i) ||
    t.match(/Apellido y Nombre.*\n([A-Z0-9 .]+)\nCUIT:/i);
  if (razonCliente) {
    result.razonSocialCliente = razonCliente[1].trim();
  }

  // 7) Condición frente al IVA
  const condMatch = t.match(/Condici[oó]n frente al IVA:\s*([\s\S]*?)(?:\n\n|\nCUIT:|\nI\.I\.B\.B)/i);
  if (condMatch) {
    result.condicionIva = condMatch[1].split('\n')[0].trim();
  } else if (/Responsable Monotributo/i.test(t)) {
    result.condicionIva = 'Responsable Monotributo';
  }

  // 8) Monto total
  const totalMatch =
    t.match(/Importe Total:\s*\$?\s*([\d\.\,]+)/i) ||
    t.match(/Total\s*:\s*\$?\s*([\d\.\,]+)/i);
  if (totalMatch) {
    result.montoTotal = parseArgAmount(totalMatch[1]);
  }

  // 9) Monto IVA
  if (/IVA Sujeto Exento/i.test(t) || /Responsable Monotributo/i.test(t)) {
    result.montoIva = 0;
  } else {
    const ivaMatch = t.match(/IVA[^0-9]*([\d\.\,]+)/i);
    if (ivaMatch) {
      result.montoIva = parseArgAmount(ivaMatch[1]) ?? 0;
    }
  }

  return result;
}

/**
 * Helper completo: baja el PDF de S3, extrae texto con pdf2json y lo parsea.
 */
export async function parseInvoicePdfFromS3(s3Key: string): Promise<{
  text: string;
  parsed: ParsedInvoiceFields;
}> {
  const buffer = await getPdfBufferFromS3(s3Key);
  const text = await extractTextWithPdf2json(buffer);
  const parsed = parseAfipInvoiceText(text);
  return { text, parsed };
}
