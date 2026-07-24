import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { ErrorCode, ERROR_STATUS_MAP, fail } from '@declawd/shared';

/**
 * Thrown by route handlers/services for domain errors that should map to a
 * specific ErrorCode/status. Anything else (unexpected exceptions, Prisma
 * errors, etc.) is treated as ErrorCode.INTERNAL_ERROR and its details are
 * never leaked to the client.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const status = ERROR_STATUS_MAP[ErrorCode.VALIDATION_ERROR];
      reply.status(status).send(fail(ErrorCode.VALIDATION_ERROR, 'Invalid request payload', error.flatten()));
      return;
    }

    if (error instanceof ApiError) {
      const status = ERROR_STATUS_MAP[error.code];
      reply.status(status).send(fail(error.code, error.message, error.details));
      return;
    }

    // Fastify's own validation (schema-based route validation, payload too large, etc.)
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      const code = error.statusCode === 429 ? ErrorCode.RATE_LIMITED : ErrorCode.VALIDATION_ERROR;
      reply.status(error.statusCode).send(fail(code, error.message));
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    reply.status(500).send(fail(ErrorCode.INTERNAL_ERROR, 'Internal server error'));
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send(fail(ErrorCode.NOT_FOUND, 'Resource not found'));
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });
