import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseInvoicePdfFromS3 } from '../../core/pdf.js';

const BodySchema = z.object({
  s3_key: z.string().min(1)
});

export default async function debugRoutes(app: FastifyInstance) {
  app.post('/parse-pdf', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.badRequest('Invalid body', parsed.error.format());
    }

    const { s3_key } = parsed.data;

    const { text, parsed: fields } = await parseInvoicePdfFromS3(s3_key);

    return reply.send({
      s3_key,
      parsed: fields,
      // si querés ver el texto para debug:
      text
    });
  });
}
