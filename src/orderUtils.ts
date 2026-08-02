import { OrderItemStatus } from "./types";
import type { Order, OrderItem, Product } from "./types";

const DIRECT_SERVICE_CATEGORY_IDS = new Set(["c3", "cat_tragos", "cat_bebidas"]);

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
 */
export function isPendingKitchenItem(item: OrderItem, findProduct: (productId: string) => Product | undefined) {
  if (isDirectServiceProduct(findProduct(item.productId))) return false;
  return item.status !== OrderItemStatus.DELIVERED;
}

/**
 * Whether an order still has anything for the kitchen to show. An order whose
 * dishes are all served has an empty ticket, so the ticket comes off the
 * display — and a later round puts it back, because the new dishes are owed
 * again.
 */
export function hasPendingKitchenWork(order: Order, findProduct: (productId: string) => Product | undefined) {
  return order.items.some((item) => isPendingKitchenItem(item, findProduct));
}
