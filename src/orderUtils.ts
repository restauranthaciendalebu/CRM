import type { Product } from "./types";

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
