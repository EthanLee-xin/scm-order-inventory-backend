import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { authHook } from "../../apps/api-gateway/src/plugins/auth.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

const mockedVerify = vi.mocked(jwt.verify);

describe("authHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns 401 when authorization header is missing", async () => {
    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    const request = {
      headers: {},
      routeOptions: { config: {} },
    } as any;

    await authHook(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "UNAUTHORIZED" }),
    );
  });

  it("allows request when token is valid", async () => {
    mockedVerify.mockReturnValue({ id: "user-1", role: "buyer" } as any);

    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    const request = {
      headers: { authorization: "Bearer valid-token" },
      routeOptions: { config: {} },
      user: undefined,
    } as any;

    await authHook(request, reply);

    expect(mockedVerify).toHaveBeenCalledWith("valid-token", "test-secret");
    expect(request.user).toEqual({ id: "user-1", role: "buyer" });
    expect(reply.send).not.toHaveBeenCalled();
  });
});
