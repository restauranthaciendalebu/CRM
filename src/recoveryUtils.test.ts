import assert from "node:assert/strict";
import test from "node:test";
import { shouldArchiveEntityChange } from "./recoveryUtils";
import { OrderItemStatus, OrderStatus } from "./types";

const order = {
  id: "order-1",
  tableId: "table-1",
  waiterId: "user-1",
  customerCount: 2,
  status: OrderStatus.PREPARING,
  items: [{
    id: "item-1",
    productId: "product-1",
    quantity: 2,
    status: OrderItemStatus.PREPARING,
    notes: "",
    selectedModifiers: [],
  }],
  createdAt: "2026-07-26T00:00:00.000Z",
  updatedAt: "2026-07-26T00:00:00.000Z",
};

test("archives deleted entities and destructive order item changes", () => {
  assert.equal(shouldArchiveEntityChange("payments", { id: "payment-1" }, undefined), true);
  assert.equal(
    shouldArchiveEntityChange("orders", order, {
      ...order,
      items: [{ ...order.items[0], quantity: 1 }],
    }),
    true,
  );
});

test("does not archive routine kitchen status changes", () => {
  assert.equal(
    shouldArchiveEntityChange("orders", order, {
      ...order,
      items: [{ ...order.items[0], status: OrderItemStatus.READY }],
    }),
    false,
  );
});
