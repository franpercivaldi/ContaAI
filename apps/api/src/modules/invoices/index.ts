import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/db.js';
import { EstadoArca } from '@prisma/client';
import { requireRole } from '../../core/auth.js';


// 1) Validación de query con Zod (tipado y defaults)
const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  estado_arca: z.nativeEnum(EstadoArca).optional(),
  habilitada_pago: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  supplier_cuit: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(), // YYYY-MM-DD
  dateTo: z.string().trim().optional(),   // YYYY-MM-DD
  sortBy: z
    .enum(['fecha_emision', 'monto_total', 'created_at'])
    .default('fecha_emision'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

// 2) Mapeo de sort keys a campos reales de Prisma
const sortMap: Record<string, any> = {
  fecha_emision: { fechaEmision: undefined },
  monto_total:   { montoTotal:   undefined },
  created_at:    { createdAt:    undefined },
};

// 3) Schemas auxiliares
const IdParamSchema = z.object({
  id: z.string().uuid(),
});

const PatchBodySchema = z.object({
  habilitada_pago: z.boolean().optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
});

export default async function invoicesRoutes(app: FastifyInstance) {
  // GET /invoices
  app.get('/', async (req, reply) => {
    const parse = ListQuerySchema.safeParse(req.query);
    if (!parse.success) {
      return reply.badRequest('Invalid query', parse.error.format());
    }
    const {
      page, pageSize, q, estado_arca, habilitada_pago,
      supplier_cuit, dateFrom, dateTo, sortBy, sortDir
    } = parse.data;

    // Construimos el "where" en función de filtros
    const where: any = {};

    if (supplier_cuit) {
      where.supplierCuit = supplier_cuit;
    }
    if (estado_arca) {
      where.estadoArca = estado_arca;
    }
    if (typeof habilitada_pago === 'boolean') {
      where.habilitadaPago = habilitada_pago;
    }
    // Rango de fechas
    if (dateFrom || dateTo) {
      where.fechaEmision = {};
      if (dateFrom) where.fechaEmision.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo)   where.fechaEmision.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    // Búsqueda simple
    if (q) {
      // busca por CUIT, número o CAE
      where.OR = [
        { supplierCuit: { contains: q } },
        { customerCuit: { contains: q } },
        // numero (BigInt) no acepta "contains", probamos exacto si es número
        ...(Number.isFinite(Number(q)) ? [{ numero: BigInt(q) }] : []),
        { cae: q },
      ];
    }

    // Orden
    const orderBy = (() => {
      const key = sortMap[sortBy];
      if (!key) return { fechaEmision: 'desc' as const };
      const field = Object.keys(key)[0] as 'fechaEmision' | 'montoTotal' | 'createdAt';
      return { [field]: sortDir };
    })();

    // Paginación
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          files: {
            take: 1, // primer archivo (si existiera)
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    // Formato de respuesta (plano y fácil para el front)
    const data = items.map((inv) => ({
        id: inv.id,
        hash: inv.hash,
        // 👇 nuevos campos
        tipo_factura: inv.tipoFactura ?? null,
        monto_iva: inv.montoIva ? inv.montoIva.toNumber() : null,
        cuil: inv.supplierCuit,
        razon_social: inv.razonSocial ?? null,
        condicion_iva: inv.condicionIva ?? null,

        supplier_cuit: inv.supplierCuit,
        customer_cuit: inv.customerCuit,
        punto_venta: inv.puntoVenta,
        numero: inv.numero.toString(),
        cae: inv.cae ?? null,
        fecha_emision: inv.fechaEmision.toISOString().slice(0, 10),
        moneda: inv.moneda,
        monto_total: inv.montoTotal.toNumber(),
        estado_arca: inv.estadoArca,
        habilitada_pago: inv.habilitadaPago,
        observaciones: inv.observaciones ?? null,
        file: inv.files[0]
            ? {
                id: inv.files[0].id,
                s3_key: inv.files[0].s3Key,
                mime: inv.files[0].mime,
                size: Number(inv.files[0].size),
                original_filename: inv.files[0].originalFilename,
            }
            : null,
        created_at: inv.createdAt.toISOString(),
        updated_at: inv.updatedAt.toISOString(),
    }));


    return reply.send({
        items: data,
        page,
        pageSize,
        total,
        });
    });

  // GET /invoices/:id
  app.get('/:id', async (req, reply) => {
    const parse = IdParamSchema.safeParse(req.params);
    if (!parse.success) {
      return reply.badRequest('Invalid id', parse.error.format());
    }
    const { id } = parse.data;

    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        files: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!inv) {
      return reply.notFound('Invoice not found');
    }

    return reply.send({
        id: inv.id,
        hash: inv.hash,

        tipo_factura: inv.tipoFactura ?? null,
        monto_iva: inv.montoIva ? inv.montoIva.toNumber() : null,
        cuil: inv.supplierCuit,
        razon_social: inv.razonSocial ?? null,
        condicion_iva: inv.condicionIva ?? null,

        supplier_cuit: inv.supplierCuit,
        customer_cuit: inv.customerCuit,
        punto_venta: inv.puntoVenta,
        numero: inv.numero.toString(),
        cae: inv.cae ?? null,
        fecha_emision: inv.fechaEmision.toISOString().slice(0, 10),
        moneda: inv.moneda,
        monto_total: inv.montoTotal.toNumber(),
        estado_arca: inv.estadoArca,
        habilitada_pago: inv.habilitadaPago,
        observaciones: inv.observaciones ?? null,
        files: inv.files.map((f) => ({
            id: f.id,
            s3_key: f.s3Key,
            mime: f.mime,
            size: Number(f.size),
            original_filename: f.originalFilename,
            created_at: f.createdAt.toISOString(),
        })),
        created_at: inv.createdAt.toISOString(),
        updated_at: inv.updatedAt.toISOString(),
    });
  });

  // PATCH /invoices/:id  (sin auth por ahora; la agregamos en el próximo paso)
  app.patch('/:id', { preHandler: [app.authenticate, requireRole('ADMIN')] }, async (req, reply) => {
    const idParse = IdParamSchema.safeParse(req.params);
    if (!idParse.success) {
      return reply.badRequest('Invalid id', idParse.error.format());
    }
    const bodyParse = PatchBodySchema.safeParse(req.body);
    if (!bodyParse.success) {
      return reply.badRequest('Invalid body', bodyParse.error.format());
    }

    const { id } = idParse.data;
    const { habilitada_pago, observaciones } = bodyParse.data;

    const inv = await prisma.invoice.update({
      where: { id },
      data: {
        ...(typeof habilitada_pago === 'boolean' ? { habilitadaPago: habilitada_pago } : {}),
        ...(observaciones !== undefined ? { observaciones } : {}),
      },
      include: { files: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    return reply.send({
      id: inv.id,
      hash: inv.hash,
      supplier_cuit: inv.supplierCuit,
      customer_cuit: inv.customerCuit,
      punto_venta: inv.puntoVenta,
      numero: inv.numero.toString(),
      cae: inv.cae ?? null,
      fecha_emision: inv.fechaEmision.toISOString().slice(0, 10),
      moneda: inv.moneda,
      monto_total: inv.montoTotal.toNumber(),
      estado_arca: inv.estadoArca,
      habilitada_pago: inv.habilitadaPago,
      observaciones: inv.observaciones ?? null,
      file: inv.files[0]
        ? {
            id: inv.files[0].id,
            s3_key: inv.files[0].s3Key,
            mime: inv.files[0].mime,
            size: Number(inv.files[0].size),
            original_filename: inv.files[0].originalFilename,
          }
        : null,
      created_at: inv.createdAt.toISOString(),
      updated_at: inv.updatedAt.toISOString(),
    });
  });
}
