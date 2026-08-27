// Expands events (including simple weekly/monthly repeat rules) into the dated
// instances visible in a range. Repeats are expanded CLIENT-SIDE from the one
// stored file — there are no per-instance files.
import type { CalendarEvent, EventInstance } from './types';
import { addDays, daysInMonth, monthOf, addMonths } from './dates';

const instance = (event: CalendarEvent, date: string): EventInstance => ({
  event,
  date,
  key: `${event.id}@${date}`,
});

/** Dates on which `ev` occurs within [from, to] (inclusive). Bounded so a
 *  runaway rule can never spin: at most a few years of occurrences. */
export function occurrences(ev: CalendarEvent, from: string, to: string): string[] {
  const out: string[] = [];
  const last = ev.until && ev.until < to ? ev.until : to;
  if (ev.date > last) return out;
  if (ev.repeat === 'weekly') {
    let d = ev.date;
    let guard = 0;
    while (d <= last && guard++ < 600) {
      if (d >= from) out.push(d);
      d = addDays(d, 7);
    }
    return out;
  }
  if (ev.repeat === 'monthly') {
    const dom = Number(ev.date.slice(8, 10));
    let ym = monthOf(ev.date);
    let guard = 0;
    while (`${ym}-01` <= last && guard++ < 240) {
      if (dom <= daysInMonth(ym)) {
        const d = `${ym}-${String(dom).padStart(2, '0')}`;
        if (d >= from && d <= last && d >= ev.date) out.push(d);
      }
      ym = addMonths(ym, 1);
    }
    return out;
  }
  if (ev.date >= from && ev.date <= to) out.push(ev.date);
  return out;
}

const sortKey = (i: EventInstance): string =>
  `${i.date}|${i.event.allDay ? '0' : '1'}|${i.event.start ?? ''}|${i.event.title.toLowerCase()}`;

/** All instances in [from, to], sorted by date, all-day first, then start time. */
export function expandEvents(events: CalendarEvent[], from: string, to: string): EventInstance[] {
  const out: EventInstance[] = [];
  for (const ev of events) for (const d of occurrences(ev, from, to)) out.push(instance(ev, d));
  return out.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
}

/** Instances grouped by date. */
export function byDate(instances: EventInstance[]): Map<string, EventInstance[]> {
  const m = new Map<string, EventInstance[]>();
  for (const i of instances) {
    const arr = m.get(i.date);
    if (arr) arr.push(i);
    else m.set(i.date, [i]);
  }
  return m;
}
