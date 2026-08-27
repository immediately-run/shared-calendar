import type { EventInstance } from '../lib/types';
import { fmtTimeRange } from '../lib/dates';
import Icon from './Icon';

/** One event in an agenda list (day panel, week column, day view). */
function EventRow({ instance, onClick }: { instance: EventInstance; onClick: () => void }) {
  const ev = instance.event;
  const n = ev.attachments.length;
  return (
    <button type="button" className={`row c-${ev.color}`} onClick={onClick}>
      <span className="t">{fmtTimeRange(ev.allDay, ev.start, ev.end)}</span>
      <span className="body">
        <span className="ttl">{ev.title}</span>
        <span className="meta">
          {ev.by}
          {ev.repeat !== 'none' && (
            <>
              {' · '}
              <Icon name="repeat" size={11} /> {ev.repeat}
            </>
          )}
          {n > 0 && (
            <>
              {' · '}
              <Icon name="paperclip" size={11} /> {n}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

export default EventRow;
