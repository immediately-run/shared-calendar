import type { EventInstance } from '../lib/types';
import { fmtDayLong, relativeLabel } from '../lib/dates';
import EventRow from './EventRow';
import Icon from './Icon';

/** The list of a day's events with an add button. Used as the desktop side
 *  panel, the mobile day sheet, and the body of the Day view. */
function DayAgenda({
  day,
  instances,
  onOpen,
  onAdd,
  canWrite,
  heading = true,
}: {
  day: string;
  instances: EventInstance[];
  onOpen: (i: EventInstance) => void;
  onAdd: (day: string) => void;
  canWrite: boolean;
  heading?: boolean;
}) {
  const rel = relativeLabel(day);
  return (
    <section className="agenda" aria-label={`Events on ${fmtDayLong(day)}`}>
      {heading && (
        <div className="agenda-head">
          <h3>{fmtDayLong(day)}</h3>
          {rel && <span className="rel">{rel}</span>}
        </div>
      )}
      {instances.length === 0 ? (
        <div className="empty">Nothing planned.</div>
      ) : (
        instances.map((i) => <EventRow key={i.key} instance={i} onClick={() => onOpen(i)} />)
      )}
      {canWrite && (
        <button type="button" className="btn btn-ghost small addbtn" onClick={() => onAdd(day)}>
          <Icon name="plus" size={16} /> Add event
        </button>
      )}
    </section>
  );
}

export default DayAgenda;
