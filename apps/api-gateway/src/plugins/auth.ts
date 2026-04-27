import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { UserPayload } from "../../../../shared/types/index.js";
import { InvalidTokenError, UnauthorizedError } from "../../../../shared/errors/index.js";

interface RouteAuthConfig {
  isPublic?: boolean;
}

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  const routeConfig = request.routeOptions
    .config as unknown as RouteAuthConfig;

  if (routeConfig?.isPublic) {
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new UnauthorizedError();
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  const token = authHeader.substring(7);

  try {
    const secret = process.env.JWT_SECRET || "";
    const decoded = jwt.verify(token, secret) as UserPayload;

    request.user = decoded;
  } catch (err) {
    request.log.error(err);
    const authError = new InvalidTokenError();
    return reply.code(authError.statusCode).send({
      error: authError.code,
      message: authError.message,
    });
  }
}
