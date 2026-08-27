// Sample events written on the first run of a PRIVATE calendar so the views are
// not empty. Shared calendars start empty on purpose (nobody wants sample data in
// a space they share).
import type { CalendarEvent } from '../lib/types';
import { addDays, startOfWeek } from '../lib/dates';
import { newId } from '../lib/store';

export function sampleEvents(today: string, by: string): CalendarEvent[] {
  const now = new Date().toISOString();
  const base = { attachments: [] as CalendarEvent['attachments'], by, created: now, updated: now };
  const monday = startOfWeek(today);
  return [
    {
      ...base, id: newId(), title: 'Movie night', date: today, allDay: false, start: '20:00', end: '22:00',
      color: 'rose', repeat: 'none', notes: 'Popcorn is in the top cupboard.',
    },
    {
      ...base, id: newId(), title: 'Family dinner', date: addDays(today, 1), allDay: false, start: '18:30',
      color: 'amber', repeat: 'none',
    },
    {
      ...base, id: newId(), title: 'Dentist', date: addDays(today, 3), allDay: false, start: '09:00', end: '09:45',
      color: 'sky', repeat: 'none', notes: 'Bring the insurance card.',
    },
    {
      ...base, id: newId(), title: 'Piano lesson', date: addDays(monday, 2), allDay: false, start: '16:00', end: '16:45',
      color: 'violet', repeat: 'weekly', notes: 'Repeats every week.',
    },
    {
      ...base, id: newId(), title: 'Trip to the lake', date: addDays(today, 6), allDay: true,
      color: 'mint', repeat: 'none', notes: 'Pack towels and the sunscreen.',
    },
    {
      ...base, id: newId(), title: 'Rent due', date: `${today.slice(0, 7)}-01`, allDay: true,
      color: 'slate', repeat: 'monthly',
    },
  ];
}
