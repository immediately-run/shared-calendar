// Event persistence over the Store. Layout:
//   <store>/events/<YYYY-MM>/<eventId>.json   one event per file
//   <store>/attachments/<eventId>/<filename>  uploaded bytes
// A repeating event lives in the month of its FIRST occurrence only.
import fs from 'fs';
import { listFiles, readJson, writeJson, removeFile, type Store } from './store';
import type { CalendarEvent } from './types';
import { monthOf } from './dates';

const join = (...p: string[]) => p.join('/').replace(/\/+/g, '/');

export const eventsDir = (store: Store): string => join(store.root, 'events');
export const monthDir = (store: Store, ym: string): string => join(eventsDir(store), ym);
export const eventPath = (store: Store, ev: Pick<CalendarEvent, 'id' | 'date'>): string =>
  join(monthDir(store, monthOf(ev.date)), `${ev.id}.json`);
export const attachmentsDir = (store: Store, eventId: string): string =>
  join(store.root, 'attachments', eventId);

const COLORS = new Set(['rose', 'violet', 'sky', 'mint', 'amber', 'slate']);

/** Accept only records that look like events — a foreign or half-written file in
 *  a shared space must not take the whole calendar down. */
function normalize(raw: unknown): CalendarEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.date !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const repeat = r.repeat === 'weekly' || r.repeat === 'monthly' ? r.repeat : 'none';
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    allDay: r.allDay !== false && typeof r.start !== 'string',
    start: typeof r.start === 'string' ? r.start : undefined,
    end: typeof r.end === 'string' ? r.end : undefined,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    color: typeof r.color === 'string' && COLORS.has(r.color) ? (r.color as CalendarEvent['color']) : 'violet',
    repeat,
    until: typeof r.until === 'string' ? r.until : undefined,
    attachments: Array.isArray(r.attachments) ? (r.attachments as CalendarEvent['attachments']) : [],
    by: typeof r.by === 'string' && r.by ? r.by : 'someone',
    created: typeof r.created === 'string' ? r.created : '',
    updated: typeof r.updated === 'string' ? r.updated : '',
  };
}

export async function listMonths(store: Store): Promise<string[]> {
  const names = await listFiles(eventsDir(store));
  return names.filter((n) => /^\d{4}-\d{2}$/.test(n));
}

/** Every event in the store. Small calendars (hundreds of files) load in one
 *  round of parallel reads; repeats need the whole set anyway. */
export async function loadAllEvents(store: Store): Promise<CalendarEvent[]> {
  const months = await listMonths(store);
  const perMonth = await Promise.all(
    months.map(async (ym) => {
      const dir = monthDir(store, ym);
      const files = await listFiles(dir, '.json');
      const raws = await Promise.all(files.map((f) => readJson<unknown>(join(dir, f), null)));
      return raws.map(normalize).filter((e): e is CalendarEvent => e !== null);
    }),
  );
  return perMonth.flat();
}

/** Write an event. When its date moved to a different month the old file is
 *  removed so the record keeps living in exactly one place. */
export async function saveEvent(store: Store, ev: CalendarEvent, previousDate?: string): Promise<void> {
  await writeJson(eventPath(store, ev), ev);
  if (previousDate && monthOf(previousDate) !== monthOf(ev.date)) {
    await removeFile(eventPath(store, { id: ev.id, date: previousDate }));
  }
}

export async function deleteEvent(store: Store, ev: CalendarEvent): Promise<void> {
  await removeFile(eventPath(store, ev));
  await removeDir(attachmentsDir(store, ev.id));
}

export async function removeDir(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    /* not there, or a read-only mount */
  }
}
