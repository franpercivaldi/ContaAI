import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function registerJwt(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET!;
  const accessExpiresIn = process.env.JWT_EXPIRES_IN ?? '900s'; // 15 min
  app.register(import('@fastify/jwt'), {
    secret,
    sign: { expiresIn: accessExpiresIn }
  });
}

export type JwtUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
};

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch (e) {
    return reply.unauthorized('Invalid or missing token');
  }
}

export function requireRole(role: 'ADMIN' | 'USER') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as JwtUser | undefined;
    if (!user) return reply.forbidden('No user in token');
    if (role === 'ADMIN' && user.role !== 'ADMIN') {
      return reply.forbidden('Admin only');
    }
  };
}
