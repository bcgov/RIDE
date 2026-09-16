import { format } from 'date-fns';
import { tz, TZDate } from '@date-fns/tz';


export function getTz(datetime, timeZone) {
  if (!datetime) { return undefined; }
  datetime = new Date(datetime);
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone, timeZoneName: 'short' })
  if (isNaN(datetime.valueOf())) { return undefined; }
  return dtf.format(datetime).split(' ').pop();
}

/* The input for datetime-local stores values as to YYYY-MM-DDThh:mm; a Date()
 * is always timezone aware for the browser's timezone.  This function returns
 * a naive datestring:
 *   e.g., 2026/09/16 2:35 PM PST becomes '2026-09-16T14:35'.
 * if a timezone is provided, the datestring is adjusted to the provided timezone.
 *   e.g., 2026/09/16 2:35 PM PST becomes '2026-09-16T15:35' in MST.
 */
export function tzUnaware(datestring, timezone) {
  if (!datestring) { return ''; }
  const datetime = new Date(datestring);
  if (Number(datetime) === 0) { return ''; }
  if (timezone) {
    return format(datetime, "yyyy-MM-dd'T'HH:mm", { in: tz(timezone) });
  }
  return format(datetime, "yyyy-MM-dd'T'HH:mm");
}

/* The input for datetime-local stores values as to YYYY-MM-DDThh:mm; splitting
 * on those separators gives us the array of values to feed to a Date.
 * e.g., '2026-09-16T14:35' becomes [2026, 9, 16, 14, 35]
 */
export function tzAware(datestring, timezone) {
  const expanded = datestring.split(/[-T:]/).map((i) => parseInt(i));
  expanded[1] -= 1; // months argument is zero indexed
  if (timezone) {
    return new TZDate(...expanded, timezone);
  }
  return new TZDate(...expanded);
}

globalThis.TZDate = TZDate;
globalThis.tz = tz;
