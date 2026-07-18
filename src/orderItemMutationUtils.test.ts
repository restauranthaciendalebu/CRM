import assert from "node:assert/strict";
import test from "node:test";
import { recalculateOrderStatus, restoreOrderItemStock } from "./orderItemMutationUtils";
import { OrderItemStatus, OrderStatus, RestaurantState } from "./types";

const createState = () => ({
  products: [
    { id: "food", name: "Plato", categoryId: "c2", recipe: [{ ingredientId: "ingredient", quantity: 100 }] },
    { id: "drink", name: "Bebida", categoryId: "c3", recipe: [{ ingredientId: "ingredient", quantity: 50 }] },
  ],
  ingredients: [{ id: "ingredient", name: "Ingrediente", stock: 500 }],
  inventoryTransactions: [],
} as unknown as RestaurantState);

test("restores stock for a kitchen item already sent", () => {
  const state = createState();
  restoreOrderItemStock({
    id: "item",
    productId: "food",
    quantity: 2,
    status: OrderItemStatus.DELIVERED,
    selectedModifiers: [],
  }, 1, "order", state);

  assert.equal(state.ingredients[0].stock, 600);
  assert.equal(state.inventoryTransactions?.[0].change, 100);
  assert.equal(state.inventoryTransactions?.[0].type, "ITEM_CHANGE_RESTORE");
});

test("does not restore stock for pending or direct-service items", () => {
  const state = createState();
  restoreOrderItemStock({
    id: "pending",
    productId: "food",
    quantity: 1,
    status: OrderItemStatus.PENDING,
    selectedModifiers: [],
  }, 1, "order", state);
  restoreOrderItemStock({
    id: "drink",
    productId: "drink",
    quantity: 1,
    status: OrderItemStatus.READY,
    selectedModifiers: [],
  }, 1, "order", state);

  assert.equal(state.ingredients[0].stock, 500);
  assert.equal(state.inventoryTransactions?.length, 0);
});

test("recalculates order status after editing or deleting an item", () => {
  const order = {
    status: OrderStatus.DELIVERED,
    items: [{ status: OrderItemStatus.PREPARING }, { status: OrderItemStatus.DELIVERED }],
  } as any;
  recalculateOrderStatus(order);
  assert.equal(order.status, OrderStatus.PREPARING);

  order.items = [{ status: OrderItemStatus.READY }, { status: OrderItemStatus.DELIVERED }];
  recalculateOrderStatus(order);
  assert.equal(order.status, OrderStatus.READY);
});
