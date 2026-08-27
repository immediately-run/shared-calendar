import { useRef, useState } from 'react';
import type { Attachment, CalendarEvent, ColorKey, FileAttachment, RefAttachment, Repeat } from '../lib/types';
import { isValidTime, isValidYmd } from '../lib/dates';
import { COLORS } from '../data/colors';
import AttachmentList from './AttachmentList';
import Icon from './Icon';

/** The event form. Uploads write bytes immediately (so a thumbnail shows), and
 *  Cancel cleans up what this session added; removals are applied on Save. */
function EventEditor({
  draft,
  isNew,
  storeRoot,
  canLinkOwnSpace,
  onSave,
  onCancel,
  upload,
  link,
  unlink,
}: {
  draft: CalendarEvent;
  isNew: boolean;
  storeRoot: string;
  canLinkOwnSpace: boolean;
  onSave: (ev: CalendarEvent) => Promise<void>;
  onCancel: (added: FileAttachment[]) => void;
  upload: (eventId: string, file: File) => Promise<FileAttachment | null>;
  link: (source: 'this' | 'another') => Promise<RefAttachment | null>;
  unlink: (att: Attachment) => Promise<void>;
}) {
  const [title, setTitle] = useState(draft.title);
  const [date, setDate] = useState(draft.date);
  const [allDay, setAllDay] = useState(draft.allDay);
  const [start, setStart] = useState(draft.start ?? '');
  const [end, setEnd] = useState(draft.end ?? '');
  const [notes, setNotes] = useState(draft.notes ?? '');
  const [color, setColor] = useState<ColorKey>(draft.color);
  const [repeat, setRepeat] = useState<Repeat>(draft.repeat);
  const [until, setUntil] = useState(draft.until ?? '');
  const [attachments, setAttachments] = useState<Attachment[]>(draft.attachments);
  const [added, setAdded] = useState<FileAttachment[]>([]);
  const [removed, setRemoved] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const validate = (): string | null => {
    if (!title.trim()) return 'Give the event a title.';
    if (!isValidYmd(date)) return 'Pick a valid date.';
    if (!allDay) {
      if (!isValidTime(start)) return 'Pick a start time, or make it all-day.';
      if (end && !isValidTime(end)) return 'The end time is not valid.';
      if (end && end < start) return 'The end time is before the start.';
    }
    if (repeat !== 'none' && until && !isValidYmd(until)) return 'The "until" date is not valid.';
    if (repeat !== 'none' && until && until < date) return 'The "until" date is before the first occurrence.';
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setBusy('Saving…');
    try {
      for (const r of removed) await unlink(r);
      const now = new Date().toISOString();
      await onSave({
        ...draft,
        title: title.trim(),
        date,
        allDay,
        start: allDay ? undefined : start,
        end: allDay || !end ? undefined : end,
        notes: notes.trim() || undefined,
        color,
        repeat,
        until: repeat !== 'none' && until ? until : undefined,
        attachments,
        // A new event is created at save time, not when the form opened (else it
        // shows as "edited" the moment it is added).
        created: isNew ? now : draft.created,
        updated: now,
      });
    } finally {
      setBusy(null);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(`Uploading ${files.length === 1 ? files[0].name : `${files.length} files`}…`);
    try {
      for (const f of Array.from(files)) {
        const att = await upload(draft.id, f);
        if (att) {
          setAttachments((a) => [...a, att]);
          setAdded((a) => [...a, att]);
        }
      }
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onLink = async (source: 'this' | 'another') => {
    setBusy('Waiting for the file picker…');
    try {
      const att = await link(source);
      if (att) setAttachments((a) => [...a, att]);
    } finally {
      setBusy(null);
    }
  };

  const remove = (att: Attachment) => {
    setAttachments((a) => a.filter((x) => x.id !== att.id));
    if (added.some((x) => x.id === att.id)) {
      setAdded((a) => a.filter((x) => x.id !== att.id));
      void unlink(att);
    } else {
      setRemoved((r) => [...r, att]);
    }
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="field">
        <label htmlFor="ev-title">Title</label>
        <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's happening?" autoFocus />
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="ev-date">Date</label>
          <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ev-allday">Time</label>
          <label className="check" htmlFor="ev-allday">
            <input id="ev-allday" type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
          </label>
        </div>
      </div>
      {!allDay && (
        <div className="two">
          <div className="field">
            <label htmlFor="ev-start">Starts</label>
            <input id="ev-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ev-end">Ends (optional)</label>
            <input id="ev-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      )}
      <div className="two">
        <div className="field">
          <label htmlFor="ev-repeat">Repeat</label>
          <select id="ev-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
            <option value="none">Does not repeat</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
        </div>
        {repeat !== 'none' && (
          <div className="field">
            <label htmlFor="ev-until">Until (optional)</label>
            <input id="ev-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
        )}
      </div>
      <div className="field">
        <label>Color</label>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`swatch c-${c.key}`}
              aria-label={c.label}
              aria-pressed={color === c.key}
              onClick={() => setColor(c.key)}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="ev-notes">Notes</label>
        <textarea id="ev-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the others should know" />
      </div>

      <div className="field">
        <label>Attachments</label>
        <AttachmentList attachments={attachments} storeRoot={storeRoot} onRemove={remove} />
        <div className="attbtns">
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
          <button type="button" className="btn btn-ghost small" onClick={() => fileInput.current?.click()} disabled={!!busy}>
            <Icon name="paperclip" size={15} /> Upload from device
          </button>
          {canLinkOwnSpace && (
            <button type="button" className="btn btn-ghost small" onClick={() => void onLink('this')} disabled={!!busy}>
              <Icon name="link" size={15} /> Link from this space
            </button>
          )}
          <button type="button" className="btn btn-ghost small" onClick={() => void onLink('another')} disabled={!!busy}>
            <Icon name="link" size={15} /> Link from another space
          </button>
        </div>
        <p className="fine">
          Uploads are copied into the calendar's storage. Linked files stay where they are; each viewer is asked
          before they open.
        </p>
      </div>

      {err && <div className="formerr">{err}</div>}
      <div className="actions">
        {busy && <span className="busy">{busy}</span>}
        <button type="button" className="btn btn-ghost small" onClick={() => onCancel(added)} disabled={!!busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary small" disabled={!!busy}>
          <Icon name="check" size={15} /> {isNew ? 'Add event' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default EventEditor;
