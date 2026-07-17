export type BillingSplitType = "equal" | "full" | "custom";

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
