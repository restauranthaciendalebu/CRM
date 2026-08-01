// A restaurant's day does not end at midnight. A table that sits down at 23:30,
// or a party that runs long because of an event, belongs to the night it
// started — not to the morning after. So every "day" the admin screens talk
// about is a business day: it starts at a configurable hour (6am by default)
// and runs until the same hour the next calendar day.
//
// The day labelled 2026-08-01 with a 6am cutoff therefore spans
// 2026-08-01 06:00 → 2026-08-02 06:00, in the restaurant's own local time.
// Local time is the point: timestamps are stored in UTC, and slicing the UTC
// text put the boundary at 20:00 Chilean time, which folded each night's
// dinner service into the next day.

export const DEFAULT_BUSINESS_DAY_START_HOUR = 6;

// Widened past `number` on purpose: the stored value arrives from Firestore
// config, so it has to survive whatever is actually in the document.
export const normalizeBusinessDayStartHour = (hour?: number | string | null): number => {
  // Guard before Number(): it turns both null and "" into 0, which would look
  // like a deliberate midnight cutoff and quietly reinstate the original bug.
  if (hour === null || hour === undefined || hour === "") return DEFAULT_BUSINESS_DAY_START_HOUR;
  const parsed = Number(hour);
  if (!Number.isFinite(parsed)) return DEFAULT_BUSINESS_DAY_START_HOUR;
  const rounded = Math.floor(parsed);
  if (rounded < 0 || rounded > 23) return DEFAULT_BUSINESS_DAY_START_HOUR;
  return rounded;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Local calendar day as YYYY-MM-DD, without going through UTC. */
export const formatLocalDay = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * The business day an instant is booked to, as a YYYY-MM-DD label.
 * Anything before the cutoff hour still belongs to the previous day.
 */
export const businessDayOf = (value: string | Date, startHour?: number | string | null): string => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(date.getHours() - normalizeBusinessDayStartHour(startHour));
  return formatLocalDay(date);
};

/**
 * Local midnight of the business day an instant belongs to. Useful as a
 * comparable anchor: two instants in the same business day map to the same
 * timestamp, so day arithmetic (±1 day, start of week) keeps working.
 */
export const businessDayMidnight = (value: string | Date, startHour?: number | string | null): Date =>
  new Date(`${businessDayOf(value, startHour)}T00:00:00`);

/** Real clock window a business day covers: [start, end). */
export const businessDayRange = (
  day: string,
  startHour?: number | string | null,
): { start: Date; end: Date } => {
  const start = new Date(`${day}T00:00:00`);
  start.setHours(normalizeBusinessDayStartHour(startHour), 0, 0, 0);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 1);
  return { start, end };
};

/** The business day currently in progress. */
export const currentBusinessDay = (startHour?: number | string | null): string =>
  businessDayOf(new Date(), startHour);

/** "6:00 a 6:00 del día siguiente", for explaining the cutoff in the UI. */
export const describeBusinessDay = (startHour?: number | string | null): string => {
  const hour = normalizeBusinessDayStartHour(startHour);
  return `${hour}:00 a ${hour}:00 del día siguiente`;
};
