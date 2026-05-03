import { FastifyReply } from "fastify";

import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../api-contracts/index.js";

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({
    success: true,
    data,
  } satisfies ApiSuccessResponse<T>);
}

export function sendError(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode = 500,
  details?: unknown,
) {
  return reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  } satisfies ApiErrorResponse);
}
