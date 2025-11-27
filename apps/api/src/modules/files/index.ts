import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPresignedUrlForFile } from '../../core/files.js';

const IdParamSchema = z.object({
  id: z.string().uuid()
});

export default async function filesRoutes(app: FastifyInstance) {
  // requiero estar logueado, pero no importa el rol
  app.get('/:id/presign', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.badRequest('Invalid id', parsed.error.format());
    }
    const { id } = parsed.data;

    const result = await getPresignedUrlForFile(id);
    if (!result) {
      return reply.notFound('File not found');
    }

    return reply.send(result); // { url, expiresIn }
  });
}
