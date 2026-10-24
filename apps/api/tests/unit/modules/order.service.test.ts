import { beforeEach, describe, expect, it, vi } from "vitest";
import { allowedTransitions, transitionOrder } from "../../../src/modules/orders/order.service.js";
import { orderRepository } from "../../../src/modules/orders/order.repository.js";
import { createOrderSchema } from "../../../src/modules/orders/order.schema.js";

vi.mock("../../../src/modules/orders/order.repository.js", () => ({
  orderRepository: { transition: vi.fn() },
}));

const id = "65a1b2c3d4e5f60718293a4b";

describe("allowedTransitions", () => {
  it("describes the forward-only order lifecycle", () => {
    expect(allowedTransitions).toEqual({
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["FULFILLING", "CANCELLED"],
      FULFILLING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
    });
  });

  it("has terminal states with no exits", () => {
    expect(allowedTransitions.DELIVERED).toHaveLength(0);
    expect(allowedTransitions.CANCELLED).toHaveLength(0);
  });
});

describe("transitionOrder", () => {
  beforeEach(() => vi.mocked(orderRepository.transition).mockReset());

  it("delegates valid transitions to the repository", async () => {
    vi.mocked(orderRepository.transition).mockResolvedValue({ _id: id } as never);
    await expect(transitionOrder("t", id, "PENDING", "CONFIRMED")).resolves.toEqual({ _id: id });
    expect(orderRepository.transition).toHaveBeenCalledWith("t", id, "PENDING", "CONFIRMED");
  });

  it("rejects invalid transitions without touching the repository", async () => {
    await expect(transitionOrder("t", id, "DELIVERED", "PENDING")).rejects.toThrow("Invalid order transition: DELIVERED -> PENDING");
    expect(orderRepository.transition).not.toHaveBeenCalled();
  });

  it("fails when the order changed concurrently", async () => {
    vi.mocked(orderRepository.transition).mockResolvedValue(null as never);
    await expect(transitionOrder("t", id, "PENDING", "CANCELLED")).rejects.toThrow("changed by another request");
  });
});

describe("createOrderSchema", () => {
  const valid = { warehouseId: id, items: [{ productId: id, quantity: 2 }] };

  it("accepts a valid order", () => {
    expect(createOrderSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["no items", { ...valid, items: [] }],
    ["too many items", { ...valid, items: Array.from({ length: 51 }, () => valid.items[0]) }],
    ["zero quantity", { ...valid, items: [{ productId: id, quantity: 0 }] }],
    ["fractional quantity", { ...valid, items: [{ productId: id, quantity: 1.5 }] }],
    ["quantity over 100", { ...valid, items: [{ productId: id, quantity: 101 }] }],
    ["bad warehouse id", { ...valid, warehouseId: "nope" }],
  ])("rejects %s", (_name, body) => {
    expect(createOrderSchema.safeParse(body).success).toBe(false);
  });
});
