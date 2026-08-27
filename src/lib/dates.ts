// Calendar date arithmetic on `YYYY-MM-DD` / `YYYY-MM` strings in LOCAL time.
// Strings (not Date objects) are the currency of the app so that keys, file
// names and comparisons are all plain lexical operations.

const pad2 = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseYmd = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const today = (): string => ymd(new Date());

export const addDays = (s: string, n: number): string => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

/** `YYYY-MM` of a day. */
export const monthOf = (s: string): string => s.slice(0, 7);

export const addMonths = (ym: string, n: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

export const daysInMonth = (ym: string): number => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

/** Monday-first weekday index, 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (s: string): number => (parseYmd(s).getDay() + 6) % 7;

export const startOfWeek = (s: string): string => addDays(s, -weekdayIndex(s));

/** The 7 days of the week containing `s`, Monday first. */
export const weekOf = (s: string): string[] => {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/** A grid of weeks covering the month, Monday first, padded with the
 *  neighbouring months so every row is full (5 or 6 rows). */
export const monthGrid = (ym: string): string[][] => {
  const start = startOfWeek(`${ym}-01`);
  const rows: string[][] = [];
  for (let r = 0; r < 6; r++) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(start, r * 7 + i)));
  }
  const last = rows[rows.length - 1];
  if (last.every((d) => monthOf(d) !== ym)) rows.pop();
  return rows;
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const fmtMonth = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/** "Thursday, 27 August" */
export const fmtDayLong = (s: string): string => {
  const d = parseYmd(s);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "27 Aug" */
export const fmtDayShort = (s: string): string => {
  const d = parseYmd(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};

export const dayNumber = (s: string): number => Number(s.slice(8, 10));

/** "24 – 30 Aug 2026" or "31 Aug – 6 Sep 2026" */
export const fmtWeekRange = (days: string[]): string => {
  const a = parseYmd(days[0]);
  const b = parseYmd(days[days.length - 1]);
  const sameMonth = a.getMonth() === b.getMonth();
  const left = sameMonth ? `${a.getDate()}` : `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)}`;
  return `${left} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
};

/** Today / Tomorrow / Yesterday, else null. */
export const relativeLabel = (s: string): string | null => {
  const t = today();
  if (s === t) return 'Today';
  if (s === addDays(t, 1)) return 'Tomorrow';
  if (s === addDays(t, -1)) return 'Yesterday';
  return null;
};

export const isValidYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s;
export const isValidTime = (s: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** "09:00–09:45", "14:00", or "All day". */
export const fmtTimeRange = (allDay: boolean, start?: string, end?: string): string => {
  if (allDay || !start) return 'All day';
  return end ? `${start}–${end}` : start;
};
