export type BillingSplitType = "equal" | "full" | "custom";

// The owner hands out discount cards, mostly 10%. These are the one-tap
// options at billing; anything else is typed in, because the card decides.
export const DISCOUNT_PRESETS = [10, 15, 20];

// Above this the billing screen warns before charging. Nothing is blocked —
// inviting a whole table is legitimate — but a typo (50 instead of 5) should
// not slip past unnoticed until the day's cash-out.
export const DISCOUNT_WARNING_PERCENT = 30;

/**
 * A discount percentage the rest of the billing math can trust: a whole number
 * between 0 and 100. Anything unparseable reads as no discount, so a blank or
 * malformed field can never turn into a charge that is larger, or free.
 */
export function clampDiscountPercent(value: unknown) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function getRemainingBalance(accountTotal: number, paidAmount: number) {
  return Math.max(0, Math.round(accountTotal) - Math.round(paidAmount));
}

export function getNextPaymentAmount(
  remainingBalance: number,
  splitType: BillingSplitType,
  equalParts: number,
  customAmount: number,
) {
  if (splitType === "equal") {
    return Math.max(1, Math.round(remainingBalance / Math.max(1, equalParts)));
  }
  if (splitType === "custom") return Math.round(customAmount);
  return Math.round(remainingBalance);
}

export function allocateRemainingAdjustment(
  adjustmentTotal: number,
  adjustmentAlreadyRecorded: number,
  paymentAmount: number,
  remainingBalance: number,
) {
  const remainingAdjustment = Math.max(0, adjustmentTotal - adjustmentAlreadyRecorded);
  if (paymentAmount >= remainingBalance) return remainingAdjustment;
  return Math.round(remainingAdjustment * (paymentAmount / remainingBalance));
}
