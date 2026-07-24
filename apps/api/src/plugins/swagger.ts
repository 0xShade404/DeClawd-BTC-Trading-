import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { API_VERSION } from '@declawd/shared';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'DeClawd API',
        description: 'Non-custodial AI-powered BTC prediction-market trading platform backend.',
        version: API_VERSION,
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'declawd_access_token',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'auth' },
        { name: 'wallet' },
        { name: 'dashboard' },
        { name: 'markets' },
        { name: 'positions' },
        { name: 'trades' },
        { name: 'ledger' },
        { name: 'withdrawals' },
        { name: 'settings' },
        { name: 'bot' },
        { name: 'admin' },
        { name: 'health' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  });
};

export default fp(swaggerPlugin, { name: 'swagger' });
