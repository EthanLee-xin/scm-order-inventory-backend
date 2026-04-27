import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryRepository } from "../../apps/inventory-worker/src/repositories/inventory.repository.js";
import { OrderStatus } from "../../shared/types/order-status.js";

describe("InventoryRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commits transaction when inventory update succeeds", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ physical_stock: 7 }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as any;

    const repo = new InventoryRepository(pool);

    const result = await repo.executeOrderTransaction(
      {
        orderId: "ORD-1",
        userId: "user-1",
        productId: "P10001",
        quantity: 2,
      },
      OrderStatus.PAID,
    );

    expect(result).toBe(7);
    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE inventory"),
      [2, "P10001"],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO orders"),
      ["ORD-1", "user-1", "P10001", 2, OrderStatus.PAID],
    );
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalled();
  });

  it("rolls back transaction when inventory is insufficient", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce(undefined);

    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as any;

    const repo = new InventoryRepository(pool);

    await expect(
      repo.executeOrderTransaction(
        {
          orderId: "ORD-1",
          userId: "user-1",
          productId: "P10001",
          quantity: 2,
        },
        OrderStatus.PAID,
      ),
    ).rejects.toThrow("Inventory update failed");

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalled();
  });
});
