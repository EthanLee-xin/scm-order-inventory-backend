import "fastify";
export { OrderStatus } from "./order-status.js";

export interface UserPayload {
  id: string;
  role?: string;
}

export interface OrderCreatedEvent {
  messageId: string;
  orderId: string;
  userId: string;
  productId: string;
  quantity: number;
  timestamp: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

declare module "fastify" {
  interface FastifyRequest {
    user: UserPayload;
  }
}
