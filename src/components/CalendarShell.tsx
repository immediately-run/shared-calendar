import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CalendarApi } from '../hooks/useCalendar';
import { useIsMobile } from '../hooks/useIsMobile';
import type { CalendarEvent, EventInstance, FileAttachment } from '../lib/types';
import { addDays, addMonths, fmtDayLong, fmtMonth, fmtWeekRange, monthGrid, monthOf, today as todayYmd, weekOf } from '../lib/dates';
import { byDate, expandEvents } from '../lib/recur';
import { newId } from '../lib/store';
import TopBar, { type View } from './TopBar';
import StoreMenu from './StoreMenu';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayAgenda from './DayAgenda';
import EventDetail from './EventDetail';
import EventEditor from './EventEditor';
import Sheet from './Sheet';

interface Editing {
  draft: CalendarEvent;
  isNew: boolean;
  previousDate?: string;
}

/** The running calendar: views, navigation, the day panel/sheet, and the
 *  detail + editor dialogs. All data flows through `cal`. */
function CalendarShell({ cal }: { cal: CalendarApi }) {
  const store = cal.store!;
  const isMobile = useIsMobile();
  const today = todayYmd();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(today);
  const [daySheet, setDaySheet] = useState(false);
  // The open detail is remembered by (event id, date) and re-derived from the live
  // event list, so a polled edit shows up and a polled delete closes it.
  const [detailKey, setDetailKey] = useState<{ id: string; date: string } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const month = monthOf(cursor);
  const rows = useMemo(() => monthGrid(month), [month]);
  const week = useMemo(() => weekOf(cursor), [cursor]);

  // Poll the month on screen (shared stores learn about others' writes this way).
  useEffect(() => cal.setVisibleMonth(month), [cal, month]);

  const [from, to] = useMemo(() => {
    if (view === 'month') return [rows[0][0], rows[rows.length - 1][6]];
    if (view === 'week') return [week[0], week[6]];
    return [cursor, cursor];
  }, [view, rows, week, cursor]);
  const instances = useMemo(() => expandEvents(cal.events, from, to), [cal.events, from, to]);
  const dated = useMemo(() => byDate(instances), [instances]);
  const dayItems = dated.get(cursor) ?? [];

  const detail = useMemo<EventInstance | null>(() => {
    if (!detailKey) return null;
    const event = cal.events.find((e) => e.id === detailKey.id);
    return event ? { event, date: detailKey.date, key: `${event.id}@${detailKey.date}` } : null;
  }, [cal.events, detailKey]);
  const setDetail = useCallback((i: EventInstance | null) => setDetailKey(i ? { id: i.event.id, date: i.date } : null), []);

  const step = (n: number) => {
    if (view === 'month') setCursor(`${addMonths(month, n)}-01`);
    else if (view === 'week') setCursor(addDays(cursor, 7 * n));
    else setCursor(addDays(cursor, n));
  };

  const title = view === 'month' ? fmtMonth(month) : view === 'week' ? fmtWeekRange(week) : fmtDayLong(cursor);

  const selectDay = (day: string) => {
    setCursor(day);
    if (isMobile) setDaySheet(true);
  };

  const startNew = (day: string) => {
    const now = new Date().toISOString();
    setEditing({
      isNew: true,
      draft: {
        id: newId(),
        title: '',
        date: day,
        allDay: false,
        start: '',
        color: 'violet',
        repeat: 'none',
        attachments: [],
        by: cal.login,
        created: now,
        updated: now,
      },
    });
  };

  const startEdit = (ev: CalendarEvent) => {
    setDetail(null);
    setEditing({ isNew: false, draft: ev, previousDate: ev.date });
  };

  const saveDraft = async (ev: CalendarEvent) => {
    if (!editing) return;
    const ok = await cal.save(ev, editing.previousDate);
    if (ok) {
      setEditing(null);
      setCursor(ev.date);
    }
  };

  const cancelEdit = useCallback(
    (added: FileAttachment[]) => {
      if (!editing) return;
      if (editing.isNew) void cal.discardAttachments(editing.draft.id);
      else for (const a of added) void cal.unlinkAttachment(a);
      setEditing(null);
    },
    [cal, editing],
  );

  const deleteEvent = async (ev: CalendarEvent) => {
    if (!window.confirm(`Delete “${ev.title}”${ev.repeat !== 'none' ? ' and all its repeats' : ''}?`)) return;
    if (await cal.remove(ev)) setDetail(null);
  };

  const canWrite = !cal.readOnly;
  const closeDetail = useCallback(() => setDetail(null), [setDetail]);
  const closeSheet = useCallback(() => setDaySheet(false), []);

  return (
    <>
      <TopBar
        title={title}
        view={view}
        onView={(v) => {
          setView(v);
          setDaySheet(false);
        }}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setCursor(today)}
        onNew={() => startNew(cursor)}
        canWrite={canWrite}
        store={store}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
        menu={
          <StoreMenu
            store={store}
            onCreate={cal.createShared}
            onOpen={cal.openShared}
            onPrivate={cal.usePrivate}
            onClose={() => setMenuOpen(false)}
            displayName={cal.displayName}
            onDisplayName={(n) => void cal.setDisplayName(n)}
          />
        }
      />
      {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />}

      <main className={`main view-${view}${isMobile ? ' mobile' : ''}`}>
        {view === 'month' && (
          <>
            <MonthView
              month={month}
              rows={rows}
              byDate={dated}
              selected={cursor}
              today={today}
              compact={isMobile}
              onSelect={selectDay}
              onOpen={setDetail}
            />
            {!isMobile && (
              <aside className="daypanel">
                <DayAgenda day={cursor} instances={dayItems} onOpen={setDetail} onAdd={startNew} canWrite={canWrite} />
              </aside>
            )}
          </>
        )}
        {view === 'week' && (
          <WeekView days={week} byDate={dated} today={today} compact={isMobile} canWrite={canWrite} onOpen={setDetail} onAdd={startNew} />
        )}
        {view === 'day' && (
          <div className="dayview">
            <DayAgenda day={cursor} instances={dayItems} onOpen={setDetail} onAdd={startNew} canWrite={canWrite} heading={false} />
          </div>
        )}
        {cal.loading && cal.events.length === 0 && <div className="loadingbar">Loading events…</div>}
      </main>

      {daySheet && isMobile && view === 'month' && (
        <Sheet title={fmtDayLong(cursor)} onClose={closeSheet}>
          <DayAgenda
            day={cursor}
            instances={dayItems}
            onOpen={(i) => {
              setDaySheet(false);
              setDetail(i);
            }}
            onAdd={(d) => {
              setDaySheet(false);
              startNew(d);
            }}
            canWrite={canWrite}
            heading={false}
          />
        </Sheet>
      )}

      {detail && !editing && (
        <Sheet title="Event" onClose={closeDetail}>
          <EventDetail
            instance={detail}
            storeRoot={store.root}
            canWrite={canWrite}
            onEdit={() => startEdit(detail.event)}
            onDelete={() => void deleteEvent(detail.event)}
          />
        </Sheet>
      )}

      {editing && (
        <Sheet title={editing.isNew ? 'New event' : 'Edit event'} onClose={() => cancelEdit([])} wide>
          <EventEditor
            key={editing.draft.id}
            draft={editing.draft}
            isNew={editing.isNew}
            storeRoot={store.root}
            canLinkOwnSpace={store.kind === 'space'}
            onSave={saveDraft}
            onCancel={cancelEdit}
            upload={cal.upload}
            link={cal.link}
            unlink={cal.unlinkAttachment}
          />
        </Sheet>
      )}
    </>
  );
}

export default CalendarShell;
