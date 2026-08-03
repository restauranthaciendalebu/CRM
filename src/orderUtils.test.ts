import assert from "node:assert/strict";
import test from "node:test";
import { hasPendingKitchenWork, isPendingKitchenItem, pendingKitchenItems } from "./orderUtils";
import { OrderItemStatus, OrderStatus } from "./types";
import type { Order, OrderItem, Product } from "./types";

const PLATO: Product = { id: "p_lomo", categoryId: "cat_fondos" } as Product;
const BEBIDA: Product = { id: "p_bebida", categoryId: "cat_bebidas" } as Product;

const findProduct = (productId: string) =>
  [PLATO, BEBIDA].find((candidate) => candidate.id === productId);

const item = (id: string, productId: string, status: OrderItemStatus): OrderItem =>
  ({ id, productId, quantity: 1, status, selectedModifiers: [] }) as OrderItem;

const orderWith = (items: OrderItem[]): Order =>
  ({ id: "o_1", tableId: "t_1", status: OrderStatus.PREPARING, items }) as Order;

test("a dish still owed stays on the kitchen display", () => {
  for (const status of [
    OrderItemStatus.PENDING,
    OrderItemStatus.SENT_TO_KITCHEN,
    OrderItemStatus.RECEIVED,
    OrderItemStatus.PREPARING,
    OrderItemStatus.READY,
  ]) {
    assert.equal(isPendingKitchenItem(item("i", PLATO.id, status), findProduct), true, status);
  }
});

test("a served dish comes off the ticket", () => {
  assert.equal(
    isPendingKitchenItem(item("i", PLATO.id, OrderItemStatus.DELIVERED), findProduct),
    false,
  );
});

test("drinks never reach the kitchen display, served or not", () => {
  assert.equal(
    isPendingKitchenItem(item("i", BEBIDA.id, OrderItemStatus.SENT_TO_KITCHEN), findProduct),
    false,
  );
  assert.equal(
    isPendingKitchenItem(item("i", BEBIDA.id, OrderItemStatus.DELIVERED), findProduct),
    false,
  );
});

test("the ticket stays while any dish is still owed", () => {
  const order = orderWith([
    item("i1", PLATO.id, OrderItemStatus.DELIVERED),
    item("i2", PLATO.id, OrderItemStatus.PREPARING),
  ]);
  assert.equal(hasPendingKitchenWork(order, findProduct), true);
});

test("the ticket goes once the last dish is served", () => {
  const order = orderWith([
    item("i1", PLATO.id, OrderItemStatus.DELIVERED),
    item("i2", PLATO.id, OrderItemStatus.DELIVERED),
  ]);
  assert.equal(hasPendingKitchenWork(order, findProduct), false);
});

// A table that orders more after being served must come back to the line,
// otherwise the second round would be cooked by nobody.
test("a second round brings the ticket back", () => {
  const served = orderWith([item("i1", PLATO.id, OrderItemStatus.DELIVERED)]);
  assert.equal(hasPendingKitchenWork(served, findProduct), false);

  served.items.push(item("i2", PLATO.id, OrderItemStatus.SENT_TO_KITCHEN));
  assert.equal(hasPendingKitchenWork(served, findProduct), true);

  // ...showing only the new dish, not the one already served.
  const shown = served.items.filter((it) => isPendingKitchenItem(it, findProduct));
  assert.deepEqual(shown.map((it) => it.id), ["i2"]);
});

// A table that only ordered drinks never had a kitchen ticket to begin with.
test("an order of drinks alone never shows a ticket", () => {
  const order = orderWith([
    item("i1", BEBIDA.id, OrderItemStatus.SENT_TO_KITCHEN),
    item("i2", BEBIDA.id, OrderItemStatus.DELIVERED),
  ]);
  assert.equal(hasPendingKitchenWork(order, findProduct), false);
});

// An unknown product must not vanish from the line: better a ticket the cook
// can question than a dish nobody is told to make.
test("a dish whose product is missing is still shown", () => {
  const order = orderWith([item("i1", "p_borrado", OrderItemStatus.SENT_TO_KITCHEN)]);
  assert.equal(hasPendingKitchenWork(order, findProduct), true);
});

/* ─── Deliveries: nobody plates them, so they finish one step earlier ─── */

const IS_DELIVERY = true;

test("a delivery dish leaves the display as soon as it is ready", () => {
  const ready = item("i1", PLATO.id, OrderItemStatus.READY);

  assert.equal(isPendingKitchenItem(ready, findProduct, IS_DELIVERY), false);
  // The same dish on a table still waits to be served.
  assert.equal(isPendingKitchenItem(ready, findProduct), true);
});

test("a delivery still being cooked stays on the display", () => {
  for (const status of [
    OrderItemStatus.PENDING,
    OrderItemStatus.SENT_TO_KITCHEN,
    OrderItemStatus.RECEIVED,
    OrderItemStatus.PREPARING,
  ]) {
    assert.equal(
      isPendingKitchenItem(item("i", PLATO.id, status), findProduct, IS_DELIVERY),
      true,
      status,
    );
  }
});

test("a delivery ticket goes once every dish is ready", () => {
  const order = orderWith([
    item("i1", PLATO.id, OrderItemStatus.READY),
    item("i2", PLATO.id, OrderItemStatus.PREPARING),
  ]);
  assert.equal(hasPendingKitchenWork(order, findProduct, IS_DELIVERY), true);
  assert.deepEqual(
    pendingKitchenItems(order, findProduct, IS_DELIVERY).map((it) => it.id),
    ["i2"],
  );

  order.items[1].status = OrderItemStatus.READY;
  assert.equal(hasPendingKitchenWork(order, findProduct, IS_DELIVERY), false);
});

// The courier tap may still happen later from the waiter screen; it must not
// bring the ticket back.
test("marking a ready delivery as served changes nothing on the display", () => {
  const order = orderWith([item("i1", PLATO.id, OrderItemStatus.READY)]);
  assert.equal(hasPendingKitchenWork(order, findProduct, IS_DELIVERY), false);

  order.items[0].status = OrderItemStatus.DELIVERED;
  assert.equal(hasPendingKitchenWork(order, findProduct, IS_DELIVERY), false);
});
