import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError, ErrorCode } from "../../../../shared/errors/index.js";
import { sendError } from "../../../../shared/http/response.js";

export function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return sendError(
      reply,
      error.code,
      error.message,
      error.statusCode,
      error.details,
    );
  }

  reply.log.error(error);

  return sendError(
    reply,
    ErrorCode.INTERNAL_SERVER_ERROR,
    "Internal Server Error",
    500,
  );
}
