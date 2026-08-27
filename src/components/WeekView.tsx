import type { EventInstance } from '../lib/types';
import { WEEKDAYS, dayNumber, fmtDayShort, relativeLabel } from '../lib/dates';
import EventRow from './EventRow';
import Icon from './Icon';

/** Seven day columns on wide screens; a stacked list of days on phones. */
function WeekView({
  days,
  byDate,
  today,
  compact,
  canWrite,
  onOpen,
  onAdd,
}: {
  days: string[];
  byDate: Map<string, EventInstance[]>;
  today: string;
  compact: boolean;
  canWrite: boolean;
  onOpen: (i: EventInstance) => void;
  onAdd: (day: string) => void;
}) {
  return (
    <div className={`week${compact ? ' compact' : ''}`}>
      {days.map((day, idx) => {
        const items = byDate.get(day) ?? [];
        const rel = relativeLabel(day);
        return (
          <section key={day} className={`daycol${day === today ? ' today' : ''}`} aria-label={fmtDayShort(day)}>
            <header>
              <span className="wd">{WEEKDAYS[idx]}</span>
              <span className="n">{compact ? fmtDayShort(day) : dayNumber(day)}</span>
              {rel && <span className="rel">{rel}</span>}
              {canWrite && (
                <button type="button" className="iconbtn small" aria-label={`Add event on ${fmtDayShort(day)}`} onClick={() => onAdd(day)}>
                  <Icon name="plus" size={14} />
                </button>
              )}
            </header>
            {items.length === 0 ? (
              <div className="empty faint">—</div>
            ) : (
              items.map((i) => <EventRow key={i.key} instance={i} onClick={() => onOpen(i)} />)
            )}
          </section>
        );
      })}
    </div>
  );
}

export default WeekView;
