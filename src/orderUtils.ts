import { Product } from "./types";

// Products explicitly marked as direct service skip the kitchen workflow.
export function isDirectServiceProduct(product?: Product) {
  return product?.requiresKitchen === false;
}
