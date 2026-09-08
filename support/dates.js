const pad = (n) => String(n).padStart(2, '0');

/** Formats a Date as YYYY-MM-DD (the value format of `<input type="date">`). */
export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Formats a Date as MM-DD-YYYY (the format used in AutoGraystone data). */
export function toGraystoneDate(date) {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()}`;
}

/**
 * Normalises MM-DD-YYYY, MM/DD/YYYY, YYYY-MM-DD or YYYY/MM/DD into YYYY-MM-DD.
 */
export function normalizeDate(value) {
  if (value instanceof Date) return toIsoDate(value);
  const str = String(value).trim();
  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${pad(match[1])}-${pad(match[2])}`;
  throw new Error(`Unrecognised date "${value}". Use MM-DD-YYYY or YYYY-MM-DD.`);
}

export function today() {
  return new Date();
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/** Today shifted by `days` (negative for past) in MM-DD-YYYY. */
export function relativeDate(days) {
  return toGraystoneDate(addDays(today(), days));
}
