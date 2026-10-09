const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses 'YYYY-MM-DD' as a *local* calendar date (new Date('YYYY-MM-DD') would be UTC). */
export function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Formats a Date as local 'YYYY-MM-DD' (Date#toISOString would shift it to UTC). */
export function toLocalISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's date at local midnight. */
export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Number of calendar days a trip spans, counting both the start and end day
 * (Nov 1 -> Nov 6 is a 6-day trip). Returns 0 for invalid or reversed ranges.
 * Uses Date.UTC on the calendar parts so DST shifts can't skew the result.
 */
export function calculateTripDuration(startDateStr, endDateStr) {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const utc = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(end) - utc(start)) / MS_PER_DAY) + 1;
}
