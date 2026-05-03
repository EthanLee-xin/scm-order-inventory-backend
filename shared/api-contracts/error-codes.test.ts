import { describe, expect, it } from "vitest";
import { ErrorCodeDocs } from "./error-codes.js";

describe("error code docs", () => {
  it("contains the core shared error codes", () => {
    const codes = ErrorCodeDocs.map((doc) => doc.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "UNAUTHORIZED",
        "INVALID_TOKEN",
        "IDEMPOTENCY_KEY_REQUIRED",
        "REQUEST_IN_PROGRESS",
        "PRODUCT_NOT_FOUND",
        "OUT_OF_STOCK",
        "REMOTE_SERVICE_ERROR",
        "UNKNOWN_DEPLOYMENT_MODE",
        "INVENTORY_CONSUMPTION_FAILED",
        "INVALID_ORDER_EVENT",
        "SERVICE_NOT_READY",
        "INTERNAL_SERVER_ERROR",
      ]),
    );
  });
});
