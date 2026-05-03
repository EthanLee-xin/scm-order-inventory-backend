import "fastify";
import { UserPayloadContract } from "../api-contracts/index.js";

export { OrderStatus } from "./order-status.js";

declare module "fastify" {
  interface FastifyRequest {
    user: UserPayloadContract;
  }
}
