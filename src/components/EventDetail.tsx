import type { EventInstance } from '../lib/types';
import { fmtDayLong, fmtTimeRange } from '../lib/dates';
import AttachmentList from './AttachmentList';
import Icon from './Icon';

/** Read view of one occurrence. Members with a read-only grant see exactly this. */
function EventDetail({
  instance,
  storeRoot,
  canWrite,
  onEdit,
  onDelete,
}: {
  instance: EventInstance;
  storeRoot: string;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ev = instance.event;
  return (
    <div className={`detail c-${ev.color}`}>
      <div className="when">
        <span className="swatch-dot" />
        {fmtDayLong(instance.date)} · {fmtTimeRange(ev.allDay, ev.start, ev.end)}
        {ev.repeat !== 'none' && (
          <>
            {' · '}
            <Icon name="repeat" size={12} /> every {ev.repeat === 'weekly' ? 'week' : 'month'}
            {ev.until ? ` until ${ev.until}` : ''}
          </>
        )}
      </div>
      <h3 className="big">{ev.title}</h3>
      {ev.notes && <p className="notes">{ev.notes}</p>}
      <p className="by">
        Added by {ev.by}
        {ev.updated && ev.updated !== ev.created ? ' · edited' : ''}
      </p>
      {ev.attachments.length > 0 && (
        <>
          <h4 className="sub">Attachments</h4>
          <AttachmentList attachments={ev.attachments} storeRoot={storeRoot} />
        </>
      )}
      {canWrite && (
        <div className="actions">
          <button type="button" className="btn btn-ghost small btn-danger" onClick={onDelete}>
            <Icon name="trash" size={15} /> Delete{ev.repeat !== 'none' ? ' series' : ''}
          </button>
          <button type="button" className="btn btn-primary small" onClick={onEdit}>
            <Icon name="edit" size={15} /> Edit{ev.repeat !== 'none' ? ' series' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export default EventDetail;
