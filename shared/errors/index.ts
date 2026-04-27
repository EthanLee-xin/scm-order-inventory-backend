import { OrderStatus } from "../types/index.js";

export enum ErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
  REMOTE_SERVICE_ERROR = "REMOTE_SERVICE_ERROR",
  UNKNOWN_DEPLOYMENT_MODE = "UNKNOWN_DEPLOYMENT_MODE",
  INVENTORY_CONSUMPTION_FAILED = "INVENTORY_CONSUMPTION_FAILED",
  INVALID_ORDER_EVENT = "INVALID_ORDER_EVENT",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = "Token Invalid or Expiration") {
    super(ErrorCode.INVALID_TOKEN, message, 401);
  }
}

export class OutOfStockError extends AppError {
  constructor(message = "Out of Stock") {
    super(ErrorCode.OUT_OF_STOCK, message, 400);
  }
}

export class ProductNotFoundError extends AppError {
  constructor(message = "Product not Exist.") {
    super(ErrorCode.PRODUCT_NOT_FOUND, message, 404);
  }
}

export class RemoteServiceError extends AppError {
  constructor(message = "REMOTE_SERVICE_ERROR") {
    super(ErrorCode.REMOTE_SERVICE_ERROR, message, 502);
  }
}

export class UnknownDeploymentModeError extends AppError {
  constructor(message = "Unknown Deployment Mode") {
    super(ErrorCode.UNKNOWN_DEPLOYMENT_MODE, message, 500);
  }
}

export class InvalidOrderEventError extends AppError {
  constructor(message = "Invalid order event payload") {
    super(ErrorCode.INVALID_ORDER_EVENT, message, 400);
  }
}

export class InvalidOrderStatusTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order status transition from ${from} to ${to}`);
    this.name = "InvalidOrderStatusTransitionError";
  }
}

export class InventoryConsumptionFailedError extends AppError {
  constructor(message = "Inventory consumption failed") {
    super(ErrorCode.INVENTORY_CONSUMPTION_FAILED, message, 500);
  }
}
