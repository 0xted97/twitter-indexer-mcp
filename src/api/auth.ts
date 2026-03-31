import type { FastifyRequest, FastifyReply } from 'fastify';

export function apiKeyAuth(apiKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health endpoint
    if (request.url === '/health') return;

    const provided = request.headers['x-api-key'];
    if (provided !== apiKey) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}
