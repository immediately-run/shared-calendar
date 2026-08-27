// Domain types. One event = one JSON file under `<store>/events/<YYYY-MM>/<id>.json`
// (see events.ts) — never a single big document several people rewrite.
import type { FileCap } from '@immediately-run/sdk/tasks';

export type ColorKey = 'rose' | 'violet' | 'sky' | 'mint' | 'amber' | 'slate';
export type Repeat = 'none' | 'weekly' | 'monthly';

/** Bytes we hold ourselves: `<store>/attachments/<eventId>/<name>`. */
export interface FileAttachment {
  kind: 'file';
  id: string;
  name: string;
  /** Path relative to the store root. */
  relPath: string;
  type: string;
  size: number;
}

/** A file that lives in some space, referenced (not copied) via the platform's
 *  content-reference mechanism; resolved per viewer with `resolveContentRef`. */
export interface RefAttachment {
  kind: 'ref';
  id: string;
  name: string;
  ref: FileCap;
  /** Display name of the space the file came from, if known. */
  space?: string;
}

export type Attachment = FileAttachment | RefAttachment;

export interface CalendarEvent {
  id: string;
  title: string;
  /** First (or only) occurrence, `YYYY-MM-DD` local. */
  date: string;
  allDay: boolean;
  /** `HH:MM` — only when not all-day. */
  start?: string;
  end?: string;
  notes?: string;
  color: ColorKey;
  repeat: Repeat;
  /** Last date a repeating event may occur on (inclusive), `YYYY-MM-DD`. */
  until?: string;
  attachments: Attachment[];
  /** Login of whoever created it ("someone" when the host gave us no login). */
  by: string;
  created: string;
  updated: string;
}

/** One rendered occurrence of an event (a repeating event yields many). */
export interface EventInstance {
  event: CalendarEvent;
  date: string;
  key: string;
}

/** `<private>/config.json` — remembers which calendar to open at boot. */
export interface CalendarConfig {
  mode?: 'private' | 'shared';
  spaceId?: string;
  spaceName?: string;
  seeded?: boolean;
  /** Shown as the writer's name when the host gives the app no login. */
  displayName?: string;
}
