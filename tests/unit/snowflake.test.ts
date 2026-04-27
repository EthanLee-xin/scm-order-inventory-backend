import { describe, it, expect, vi, beforeEach } from "vitest";
import { SnowflakeGenerator } from "../../shared/utils/snowflake.js";

describe("SnowflakeGenerator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates order ids with ORD_ prefix", () => {
    vi.spyOn(Date, "now").mockReturnValue(1710000000000);

    const generator = new SnowflakeGenerator(1, 1704067200000);
    const orderId = generator.nextOrderId();

    expect(orderId).toMatch(/^ORD_\d+$/);
  });

  it("generates unique ids within the same millisecond", () => {
    vi.spyOn(Date, "now").mockReturnValue(1710000000000);

    const generator = new SnowflakeGenerator(1, 1704067200000);

    const first = generator.nextId();
    const second = generator.nextId();

    expect(first).not.toBe(second);
    expect(BigInt(second)).toBeGreaterThan(BigInt(first));
  });

  it("throws when machine id is out of range", () => {
    expect(() => new SnowflakeGenerator(1024)).toThrow(
      "machineId must be between 0 and 1023",
    );
  });

  it("throws when clock moves backwards", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1710000000000);
    nowSpy.mockReturnValueOnce(1709999999999);

    const generator = new SnowflakeGenerator(1, 1704067200000);

    generator.nextId();

    expect(() => generator.nextId()).toThrow(/Clock moved backwards/);
  });
});
