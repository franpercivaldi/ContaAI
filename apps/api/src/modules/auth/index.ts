import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/db.js';
import argon2 from 'argon2';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export default async function authRoutes(app: FastifyInstance) {
  // Issuance config
  const refreshSecret = process.env.REFRESH_SECRET!;
  const refreshExpires = process.env.REFRESH_EXPIRES_IN ?? '7d';

  // POST /auth/login
  app.post('/login', async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest('Invalid body', parsed.error.format());

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.unauthorized('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return reply.unauthorized('Invalid credentials');

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = await reply.jwtSign(payload);
    const refreshToken = await reply.jwtSign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires
    });

    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role }
    });
  });

  // POST /auth/register
  app.post('/register', async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest('Invalid body', parsed.error.format());

    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: { code: 'USER_EXISTS', message: 'Email already registered' } });
    }

    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'USER'
      }
    });

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = await reply.jwtSign(payload);
    const refreshToken = await reply.jwtSign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires
    });

    return reply.send({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
  });

  // POST /auth/refresh
  app.post('/refresh', async (req, reply) => {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest('Invalid body', parsed.error.format());

    const { refreshToken } = parsed.data;
    try {
      const decoded = await app.jwt.verify(refreshToken, { secret: refreshSecret });
      const { id, email, role } = decoded as any;
      const accessToken = await reply.jwtSign({ id, email, role });
      return reply.send({ accessToken });
    } catch {
      return reply.unauthorized('Invalid refresh token');
    }
  });

  // GET /auth/me  (requiere Bearer)
  app.get('/me', { preHandler: app.authenticate }, async (req) => {
    const u = req.user as any;
    return { id: u.id, email: u.email, role: u.role };
  });
}
