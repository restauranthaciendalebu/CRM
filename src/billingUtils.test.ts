import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateRemainingAdjustment,
  clampDiscountPercent,
  DISCOUNT_PRESETS,
  DISCOUNT_WARNING_PERCENT,
  getNextPaymentAmount,
  getRemainingBalance,
} from "./billingUtils";

test("a partial payment keeps the correct balance", () => {
  assert.equal(getRemainingBalance(10_000, 3_000), 7_000);
  assert.equal(getRemainingBalance(10_000, 10_000), 0);
});

test("equal parts charge one person at a time and close exactly", () => {
  const first = getNextPaymentAmount(10_000, "equal", 3, 0);
  const afterFirst = getRemainingBalance(10_000, first);
  const second = getNextPaymentAmount(afterFirst, "equal", 2, 0);
  const afterSecond = getRemainingBalance(afterFirst, second);
  const third = getNextPaymentAmount(afterSecond, "equal", 1, 0);

  assert.deepEqual([first, second, third], [3_333, 3_334, 3_333]);
  assert.equal(first + second + third, 10_000);
});

test("custom amount records only the entered payment", () => {
  assert.equal(getNextPaymentAmount(10_000, "custom", 2, 3_000), 3_000);
});

/* ─── Card discounts applied at billing ─── */

test("a typed discount is kept to a whole percentage between 0 and 100", () => {
  assert.equal(clampDiscountPercent(10), 10);
  assert.equal(clampDiscountPercent("25"), 25);
  assert.equal(clampDiscountPercent(12.4), 12);
  assert.equal(clampDiscountPercent(150), 100);
  assert.equal(clampDiscountPercent(-5), 0);
});

// A blank or malformed field must read as no discount. Reading as anything
// else would either overcharge or give the meal away.
test("an unusable discount value reads as no discount", () => {
  assert.equal(clampDiscountPercent(""), 0);
  assert.equal(clampDiscountPercent(null), 0);
  assert.equal(clampDiscountPercent(undefined), 0);
  assert.equal(clampDiscountPercent("abc"), 0);
  assert.equal(clampDiscountPercent(Number.NaN), 0);
  assert.equal(clampDiscountPercent(Number.POSITIVE_INFINITY), 0);
});

test("the 10% card is a one-tap option and sits below the warning line", () => {
  assert.ok(DISCOUNT_PRESETS.includes(10));
  assert.ok(DISCOUNT_PRESETS.every((preset) => preset === clampDiscountPercent(preset)));
  assert.ok(DISCOUNT_PRESETS.every((preset) => preset <= DISCOUNT_WARNING_PERCENT));
});

// The discount is charged as an amount, so it must survive being split across
// partial payments without gaining or losing a peso.
test("a 10% discount adds up exactly across a split bill", () => {
  const subtotal = 33_333;
  const discount = Math.round(subtotal * (clampDiscountPercent(10) / 100));
  const total = subtotal - discount;

  const first = allocateRemainingAdjustment(discount, 0, 10_000, total);
  const second = allocateRemainingAdjustment(discount, first, 10_000, total - 10_000);
  const third = allocateRemainingAdjustment(discount, first + second, total - 20_000, total - 20_000);

  assert.equal(first + second + third, discount);
});

test("tip allocation adds up across partial payments", () => {
  const firstTip = allocateRemainingAdjustment(1_000, 0, 3_300, 11_000);
  const secondTip = allocateRemainingAdjustment(1_000, firstTip, 3_850, 7_700);
  const finalTip = allocateRemainingAdjustment(1_000, firstTip + secondTip, 3_850, 3_850);

  assert.equal(firstTip + secondTip + finalTip, 1_000);
});
