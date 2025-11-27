import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { dbPing } from './core/db.js';
import invoicesRoutes from './modules/invoices/index.js';
import { registerJwt } from './core/auth.js';
import authRoutes from './modules/auth/index.js';
import filesRoutes from './modules/files/index.js';
import webhooksRoutes from './modules/webhooks/index.js';
import debugRoutes from './modules/debug/index.js';

const PORT = Number(process.env.PORT ?? 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const app = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty' } // usa pino-pretty en dev
  }
});

// JWT
registerJwt(app);

// Decorator: app.authenticate
app.decorate('authenticate', async function (this: any, req: any, reply: any) {
  try {
    await req.jwtVerify();
  } catch (e) {
    return reply.unauthorized('Invalid or missing token');
  }
});

// Plugins base
await app.register(sensible);
await app.register(cors, { origin: CORS_ORIGIN, credentials: true });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
// Health
app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
app.get('/health/db', async () => { await dbPing(); return { status: 'ok' }; });

// Auth routes
await app.register(authRoutes, { prefix: '/auth' });

// Invoices
await app.register(invoicesRoutes, { prefix: '/invoices' });

// Webhooks (para n8n)
await app.register(webhooksRoutes, { prefix: '/webhooks' });

// Files routes
await app.register(filesRoutes, { prefix: '/files' });

// Debug
await app.register(debugRoutes, { prefix: '/debug' });

// 404 handler
app.setNotFoundHandler((req, reply) => {
  reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler
app.setErrorHandler((err, req, reply) => {
  req.log.error({ err }, 'Unhandled error');
  const code = (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) ? err.statusCode : 500;
  reply.code(code).send({
    error: {
      code: err.code ?? (code === 500 ? 'INTERNAL' : 'ERROR'),
      message: NODE_ENV === 'production' && code === 500 ? 'Internal Server Error' : err.message
    }
  });
});

// Start
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`API listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down...`);
  try {
    await app.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
