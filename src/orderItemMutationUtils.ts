import { isDirectServiceProduct } from "./orderUtils";
import {
  Order,
  OrderItem,
  OrderItemStatus,
  OrderStatus,
  RestaurantState,
} from "./types";

const isCookingStatus = (status: OrderItemStatus) =>
  status === OrderItemStatus.SENT_TO_KITCHEN ||
  status === OrderItemStatus.RECEIVED ||
  status === OrderItemStatus.PREPARING;

export function itemHadStockDeducted(item: OrderItem, state: RestaurantState) {
  const product = state.products.find((candidate) => candidate.id === item.productId);
  return item.status !== OrderItemStatus.PENDING && !isDirectServiceProduct(product);
}

export function restoreOrderItemStock(
  item: OrderItem,
  quantity: number,
  orderId: string,
  state: RestaurantState,
) {
  if (!itemHadStockDeducted(item, state)) return;
  const product = state.products.find((candidate) => candidate.id === item.productId);
  if (!product?.recipe) return;
  if (!state.inventoryTransactions) state.inventoryTransactions = [];

  for (const recipeItem of product.recipe) {
    const ingredient = state.ingredients.find((candidate) => candidate.id === recipeItem.ingredientId);
    if (!ingredient) continue;
    const restoredQuantity = recipeItem.quantity * quantity;
    ingredient.stock += restoredQuantity;
    state.inventoryTransactions.push({
      id: "tx_inv_" + Math.random().toString(36).substring(2, 11),
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      change: restoredQuantity,
      type: "ITEM_CHANGE_RESTORE",
      referenceId: orderId,
      createdAt: new Date().toISOString(),
    });
  }
}

export function recalculateOrderStatus(order: Order) {
  if (order.items.length === 0) {
    order.status = OrderStatus.PREPARING;
    return;
  }
  if (order.items.every((item) => item.status === OrderItemStatus.DELIVERED)) {
    order.status = OrderStatus.DELIVERED;
    return;
  }
  if (order.items.every((item) =>
    item.status === OrderItemStatus.READY || item.status === OrderItemStatus.DELIVERED
  )) {
    order.status = OrderStatus.READY;
    return;
  }
  if (order.items.some((item) => isCookingStatus(item.status))) {
    order.status = OrderStatus.PREPARING;
    return;
  }
  if (order.status !== OrderStatus.PENDING_APPROVAL) order.status = OrderStatus.PREPARING;
}
