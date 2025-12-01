import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/db.js';
import { parseInvoicePdfFromS3 } from '../../core/pdf.js';
import { mapCuitToOrganization } from '../../core/organization.js';
import { extractInvoiceWithLlm } from '../../core/llm-invoice.js';

const WebhookInvoiceSchema = z.object({
  hash: z.string().min(10),

  tipo_factura: z.string().optional().nullable(),
  monto_iva: z.number().optional().nullable(),
  razon_social: z.string().optional().nullable(),
  condicion_iva: z.string().optional().nullable(),

  supplier_cuit: z.string().optional().nullable(),
  customer_cuit: z.string().optional().nullable(),
  punto_venta: z.number().int().optional().nullable(),
  numero: z.union([z.number().int(), z.string().regex(/^\d+$/)]).optional().nullable(),
  cae: z.string().optional().nullable(),
  fecha_emision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  moneda: z.string().default('ARS'),
  monto_total: z.number().optional().nullable(),

  estado_arca: z.enum(['VALIDA', 'INVALIDA', 'PENDIENTE', 'ERROR']).default('PENDIENTE'),

  file: z.object({
    s3_key: z.string(),
    original_filename: z.string(),
    mime: z.string(),
    size: z.number()
  })
});

export default async function webhooksRoutes(app: FastifyInstance) {
  app.post('/invoices', async (req, reply) => {
    const token = req.headers['x-machine-token'];
    if (!token || token !== process.env.WEBHOOK_MACHINE_TOKEN) {
      return reply.unauthorized('Invalid machine token');
    }

    const parsedBody = WebhookInvoiceSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return reply.badRequest('Invalid body', parsedBody.error.format());
    }
    const payload = parsedBody.data;

    // 1️⃣ Primer paso: asegurar existencia mínima de la invoice (sin usar campos del webhook)
    // Los datos de la invoice se completarán únicamente con lo que devuelva el LLM.
    const initialOrg = mapCuitToOrganization(payload.customer_cuit ?? undefined);

    const invoice = await prisma.invoice.upsert({
      where: { hash: payload.hash },
      update: {},
      create: {
        hash: payload.hash,
        supplierCuit: '',
        customerCuit: '',
        puntoVenta: 0,
        numero: BigInt(0),
        cae: null,
        fechaEmision: new Date(),
        moneda: 'ARS',
        montoTotal: 0,
        estadoArca: 'PENDIENTE',
        habilitadaPago: false,
        organization: initialOrg,
        observaciones: null,
        tipoFactura: null,
        montoIva: null,
        razonSocial: null,
        condicionIva: null,
        files: {
          create: {
            s3Key: payload.file.s3_key,
            originalFilename: payload.file.original_filename,
            mime: payload.file.mime,
            size: BigInt(payload.file.size),
            sha256: payload.hash
          }
        }
      }
    });

    // 2️⃣ Segundo paso: bajar PDF usando el s3Key REAL de la DB, extraer texto, pedirle a GPT que lo lea y actualizar la invoice
    try {
      // Volvemos a leer la invoice desde la DB, incluyendo los files
      const fullInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: { files: true }
      });

      if (!fullInvoice || fullInvoice.files.length === 0) {
        req.log.warn(
          { invoiceId: invoice.id, hash: payload.hash },
          'Invoice sin files asociados, no se puede parsear PDF'
        );
      } else {
        // Usamos el mismo s3Key que usa el front para descargar
        const s3Key = fullInvoice.files[0].s3Key;

        req.log.info({ s3Key, hash: payload.hash }, 'Usando s3Key desde DB para parsear PDF');

        // 1) Bajar el PDF y extraer texto (pdf2json)
        const { text } = await parseInvoicePdfFromS3(s3Key);

        // 2) Pedirle a GPT que extraiga los campos
        const llm = await extractInvoiceWithLlm(text);

        if (!llm) {
          req.log.warn({ hash: payload.hash, s3Key }, 'LLM no devolvió datos válidos');
        } else {
          req.log.info({ llm, s3Key }, 'Parsed invoice with LLM');

          const updateData: any = {};

          if (llm.tipo_factura) updateData.tipoFactura = llm.tipo_factura;
          if (llm.punto_venta != null) updateData.puntoVenta = llm.punto_venta;
          if (llm.numero_comprobante != null) {
            updateData.numero = BigInt(llm.numero_comprobante);
          }
          if (llm.condicion_iva) updateData.condicionIva = llm.condicion_iva;

          if (llm.razon_social_cliente) updateData.razonSocial = llm.razon_social_cliente;

          // NOTE: LLM fields `cuit_emisor` and `cuit_cliente` were observed swapped.
          // Assign supplier/customer accordingly (swap) so the customerCuit maps to organization.
          if (llm.cuit_cliente) updateData.supplierCuit = llm.cuit_cliente;
          if (llm.cuit_emisor) {
            updateData.customerCuit = llm.cuit_emisor;
            updateData.organization = mapCuitToOrganization(llm.cuit_emisor);
          }

          if (llm.fecha_emision) {
            updateData.fechaEmision = new Date(`${llm.fecha_emision}T00:00:00.000Z`);
          }

          if (llm.monto_total != null) updateData.montoTotal = llm.monto_total;
          if (llm.monto_iva != null) updateData.montoIva = llm.monto_iva;

          if (Object.keys(updateData).length > 0) {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: updateData
            });
          }
        }
      }
    } catch (err) {
      req.log.error(
        { err, hash: payload.hash },
        'Error parsing invoice PDF from S3 / LLM'
      );
    }

    return reply.send({
      id: invoice.id,
      created: invoice.createdAt.getTime() === invoice.updatedAt.getTime()
    });
  });
}
