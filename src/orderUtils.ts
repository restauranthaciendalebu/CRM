import { OrderItemStatus } from "./types";
import type { Order, OrderItem, Product } from "./types";

const DIRECT_SERVICE_CATEGORY_IDS = new Set(["c3", "cat_tragos", "cat_bebidas"]);

type FindProduct = (productId: string) => Product | undefined;

// Drinks and explicitly direct-service products skip the kitchen workflow.
export function isDirectServiceProduct(product?: Product) {
  return Boolean(
    product && (
      product.requiresKitchen === false ||
      DIRECT_SERVICE_CATEGORY_IDS.has(product.categoryId)
    )
  );
}

/**
 * Whether a dish is still owed by the kitchen, and so belongs on the display.
 *
 * A dish drops off the moment it is served: the line only needs what is still
 * outstanding, and finished dishes crowd out the ones being cooked. Drinks and
 * other direct-service products never appear at all — they don't pass through
 * the kitchen.
 *
 * Deliveries stop one step earlier, at ready. Nobody plates a delivery, so
 * there is no waiter carrying it to a table and tapping "served" afterwards;
 * waiting for that tap would leave the ticket sitting on the display until the
 * order was billed. Billing accepts ready as well as served, so nothing
 * downstream needs the extra step.
 */
export function isPendingKitchenItem(
  item: OrderItem,
  findProduct: FindProduct,
  isDelivery = false,
) {
  if (isDirectServiceProduct(findProduct(item.productId))) return false;
  if (isDelivery) {
    return item.status !== OrderItemStatus.READY && item.status !== OrderItemStatus.DELIVERED;
  }
  return item.status !== OrderItemStatus.DELIVERED;
}

/** The dishes of an order that the kitchen display should still be showing. */
export function pendingKitchenItems(order: Order, findProduct: FindProduct, isDelivery = false) {
  return order.items.filter((item) => isPendingKitchenItem(item, findProduct, isDelivery));
}

/**
 * Whether an order still has anything for the kitchen to show. An order whose
 * dishes are all done has an empty ticket, so the ticket comes off the display
 * — and a later round puts it back, because the new dishes are owed again.
 */
export function hasPendingKitchenWork(order: Order, findProduct: FindProduct, isDelivery = false) {
  return order.items.some((item) => isPendingKitchenItem(item, findProduct, isDelivery));
}
