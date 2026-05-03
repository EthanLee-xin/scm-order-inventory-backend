export type ErrorCodeDoc = {
  code: string;
  statusCode: number;
  message: string;
  description: string;
};

export const ErrorCodeDocs: ErrorCodeDoc[] = [
  {
    code: "UNAUTHORIZED",
    statusCode: 401,
    message: "Unauthorized",
    description: "The request is missing valid authentication credentials.",
  },
  {
    code: "INVALID_TOKEN",
    statusCode: 401,
    message: "Token Invalid or Expiration",
    description: "The bearer token is invalid, expired, or cannot be verified.",
  },
  {
    code: "IDEMPOTENCY_KEY_REQUIRED",
    statusCode: 400,
    message: "Idempotency-Key header is required",
    description: "The order request must include an Idempotency-Key header.",
  },
  {
    code: "REQUEST_IN_PROGRESS",
    statusCode: 409,
    message: "The same idempotency key is being processed",
    description: "A request with the same idempotency key is already in progress.",
  },
  {
    code: "PRODUCT_NOT_FOUND",
    statusCode: 404,
    message: "Product not Exist.",
    description: "The requested product could not be found.",
  },
  {
    code: "OUT_OF_STOCK",
    statusCode: 400,
    message: "Out of Stock",
    description: "The requested quantity exceeds available inventory.",
  },
  {
    code: "REMOTE_SERVICE_ERROR",
    statusCode: 502,
    message: "REMOTE_SERVICE_ERROR",
    description: "A downstream service returned an error.",
  },
  {
    code: "UNKNOWN_DEPLOYMENT_MODE",
    statusCode: 500,
    message: "Unknown Deployment Mode",
    description: "The application was started with an unsupported deployment mode.",
  },
  {
    code: "INVENTORY_CONSUMPTION_FAILED",
    statusCode: 500,
    message: "Inventory consumption failed",
    description: "The inventory worker failed to process an order event.",
  },
  {
    code: "INVALID_ORDER_EVENT",
    statusCode: 400,
    message: "Invalid order event payload",
    description: "The RabbitMQ payload does not match the expected order event contract.",
  },
  {
    code: "SERVICE_NOT_READY",
    statusCode: 503,
    message: "One or more dependencies are unavailable",
    description: "One or more runtime dependencies are unavailable.",
  },
  {
    code: "INTERNAL_SERVER_ERROR",
    statusCode: 500,
    message: "Internal Server Error",
    description: "An unexpected internal error occurred.",
  },
];
