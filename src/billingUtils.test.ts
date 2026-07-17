import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateRemainingAdjustment,
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

test("tip allocation adds up across partial payments", () => {
  const firstTip = allocateRemainingAdjustment(1_000, 0, 3_300, 11_000);
  const secondTip = allocateRemainingAdjustment(1_000, firstTip, 3_850, 7_700);
  const finalTip = allocateRemainingAdjustment(1_000, firstTip + secondTip, 3_850, 3_850);

  assert.equal(firstTip + secondTip + finalTip, 1_000);
});
