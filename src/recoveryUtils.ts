import { Order, RecoverableCollection } from "./types";

const ARCHIVED_UPDATES = new Set<RecoverableCollection>([
  "payments",
  "customers",
  "users",
  "products",
  "categories",
  "ingredients",
]);

function orderWasDestructivelyChanged(before: Order, after: Order) {
  const afterItems = new Map(after.items.map((item) => [item.id, item]));
  return before.items.some((previousItem) => {
    const nextItem = afterItems.get(previousItem.id);
    return !nextItem
      || nextItem.quantity < previousItem.quantity
      || nextItem.productId !== previousItem.productId;
  });
}

export function shouldArchiveEntityChange(
  collection: RecoverableCollection,
  before: Record<string, any> | undefined,
  after: Record<string, any> | undefined,
) {
  if (!before) return false;
  if (!after) return true;
  if (collection === "orders") {
    return orderWasDestructivelyChanged(before as Order, after as Order);
  }
  return ARCHIVED_UPDATES.has(collection);
}
