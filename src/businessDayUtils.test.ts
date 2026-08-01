import assert from "node:assert/strict";
import test from "node:test";
import {
  businessDayOf,
  businessDayRange,
  describeBusinessDay,
  normalizeBusinessDayStartHour,
} from "./businessDayUtils";

// Timestamps are stored in UTC. These tests pin the behaviour that was wrong:
// a night of service must stay on the night it started, whatever the offset
// between UTC and the restaurant's clock.
const localIso = (day: string, time: string) => new Date(`${day}T${time}`).toISOString();

test("late-night service stays on the night it started", () => {
  assert.equal(businessDayOf(localIso("2026-07-31", "21:30:00"), 6), "2026-07-31");
  assert.equal(businessDayOf(localIso("2026-08-01", "01:45:00"), 6), "2026-07-31");
  assert.equal(businessDayOf(localIso("2026-08-01", "05:59:59"), 6), "2026-07-31");
});

test("the cutoff hour opens the next business day", () => {
  assert.equal(businessDayOf(localIso("2026-08-01", "06:00:00"), 6), "2026-08-01");
  assert.equal(businessDayOf(localIso("2026-08-01", "13:00:00"), 6), "2026-08-01");
});

test("a configured cutoff moves the boundary with it", () => {
  assert.equal(businessDayOf(localIso("2026-08-01", "03:00:00"), 4), "2026-07-31");
  assert.equal(businessDayOf(localIso("2026-08-01", "05:00:00"), 4), "2026-08-01");
  // Midnight cutoff is the plain calendar day.
  assert.equal(businessDayOf(localIso("2026-08-01", "00:30:00"), 0), "2026-08-01");
});

test("an invalid cutoff falls back to 6am instead of shifting the day", () => {
  assert.equal(normalizeBusinessDayStartHour(undefined), 6);
  assert.equal(normalizeBusinessDayStartHour(null), 6);
  assert.equal(normalizeBusinessDayStartHour("" as unknown as number), 6);
  assert.equal(normalizeBusinessDayStartHour(24), 6);
  assert.equal(normalizeBusinessDayStartHour(-1), 6);
  assert.equal(normalizeBusinessDayStartHour(Number.NaN), 6);
  assert.equal(normalizeBusinessDayStartHour(0), 0);
  assert.equal(normalizeBusinessDayStartHour(6.9), 6);
});

test("a bad timestamp yields no day rather than a wrong one", () => {
  assert.equal(businessDayOf("no es una fecha", 6), "");
});

test("the day's window runs cutoff to cutoff and covers exactly 24 hours", () => {
  const { start, end } = businessDayRange("2026-08-01", 6);

  assert.equal(start.getHours(), 6);
  assert.equal(start.getDate(), 1);
  assert.equal(end.getHours(), 6);
  assert.equal(end.getDate(), 2);
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
});

test("every instant in the window reports that same business day", () => {
  const day = "2026-08-01";
  const { start, end } = businessDayRange(day, 6);

  assert.equal(businessDayOf(start, 6), day);
  assert.equal(businessDayOf(new Date(end.getTime() - 1), 6), day);
  // The far edge belongs to the next day, so no sale is counted twice.
  assert.equal(businessDayOf(end, 6), "2026-08-02");
  assert.equal(businessDayOf(new Date(start.getTime() - 1), 6), "2026-07-31");
});

test("the cutoff is described the way the screen explains it", () => {
  assert.equal(describeBusinessDay(6), "6:00 a 6:00 del día siguiente");
});

// The reported bug: the cash-out screen showed 9 tables for 1 Aug when only 4
// were served that day. Five belonged to the night of 31 Jul but were closed
// after 20:00 local — past midnight UTC — so slicing the UTC text moved them.
test("a night's service is not swept into the next day's cash-out", () => {
  const closings = [
    // Night of 31 Jul: served that evening, some past midnight.
    localIso("2026-07-31", "20:15:00"),
    localIso("2026-07-31", "21:40:00"),
    localIso("2026-07-31", "22:05:00"),
    localIso("2026-07-31", "23:50:00"),
    localIso("2026-08-01", "00:35:00"),
    // The four tables actually served on 1 Aug.
    localIso("2026-08-01", "13:10:00"),
    localIso("2026-08-01", "14:25:00"),
    localIso("2026-08-01", "15:00:00"),
    localIso("2026-08-01", "19:30:00"),
  ];

  const countedOn = (day: string) =>
    closings.filter((iso) => businessDayOf(iso, 6) === day).length;

  assert.equal(countedOn("2026-08-01"), 4);
  assert.equal(countedOn("2026-07-31"), 5);

  // The old rule — slicing the UTC text — is what produced the wrong 9.
  const oldRule = (day: string) => closings.filter((iso) => iso.slice(0, 10) === day).length;
  assert.equal(oldRule("2026-08-01"), 9);

  // Nothing is dropped or double-counted by the new rule.
  assert.equal(countedOn("2026-07-31") + countedOn("2026-08-01"), closings.length);
});
