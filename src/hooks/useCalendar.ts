// The calendar's state machine: boot (private config → remembered space), the
// first-run chooser, the live store, polling for other members' writes, and every
// mutation. Components render what this returns and never touch `fs` directly.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import {
  createSharedStore,
  ensureDir,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  pollDir,
  readJson,
  writeJson,
  type Store,
} from '../lib/store';
import { attachmentsDir, deleteEvent, eventsDir, loadAllEvents, monthDir, removeDir, saveEvent } from '../lib/events';
import { removeAttachmentBytes, uploadAttachment } from '../lib/attachments';
import { linkFileFromSpace, LinkError } from '../lib/linkFile';
import { monthOf, today } from '../lib/dates';
import { sampleEvents } from '../data/seed';
import type { Attachment, CalendarConfig, CalendarEvent, FileAttachment, RefAttachment } from '../lib/types';

export type Phase = 'booting' | 'choose' | 'ready';

export interface CalendarApi {
  phase: Phase;
  store: Store | null;
  events: CalendarEvent[];
  loading: boolean;
  /** A transient message for the user (error or info). */
  notice: string | null;
  readOnly: boolean;
  /** Who is writing — `user.login`, or "someone" when the host gave no login. */
  login: string;
  createShared(): Promise<void>;
  openShared(): Promise<void>;
  usePrivate(): Promise<void>;
  /** Back to the chooser without changing anything. */
  chooseStore(): void;
  reload(): Promise<void>;
  save(ev: CalendarEvent, previousDate?: string): Promise<boolean>;
  remove(ev: CalendarEvent): Promise<boolean>;
  upload(eventId: string, file: File): Promise<FileAttachment | null>;
  link(source: 'this' | 'another'): Promise<RefAttachment | null>;
  /** Delete the bytes of an uploaded attachment (no-op for linked files). */
  unlinkAttachment(att: Attachment): Promise<void>;
  /** Drop the attachments folder of an event that was never saved. */
  discardAttachments(eventId: string): Promise<void>;
  setNotice(msg: string | null): void;
  /** Which month the views are showing — the month directory that gets polled. */
  setVisibleMonth(ym: string): void;
}

const codeOf = (e: unknown): string | undefined => (e as { code?: string } | null)?.code;
const describe = (e: unknown, fallback: string): string => {
  if (e instanceof LinkError) return e.message;
  const code = codeOf(e);
  if (code === 'auth-required') return 'Sign in to immediately.run to use the calendar.';
  if (code === 'forbidden') return 'The host refused that: this app lacks the capability.';
  if (code === 'EROFS') return 'This calendar is read-only for you.';
  const m = (e as Error | null)?.message;
  return m ? `${fallback} (${m})` : fallback;
};

export function useCalendar(): CalendarApi {
  const auth = useAuth();
  const login = auth.user?.login || 'someone';

  const [phase, setPhase] = useState<Phase>('booting');
  const [store, setStore] = useState<Store | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => monthOf(today()));

  // The private config store (opened FIRST at boot and kept, per store.ts).
  const cfgRef = useRef<{ store: Store; cfg: CalendarConfig } | null>(null);
  const configPath = (s: Store) => `${s.root}/config.json`;

  const writeConfig = useCallback(async (patch: Partial<CalendarConfig>) => {
    const c = cfgRef.current;
    if (!c) return;
    c.cfg = { ...c.cfg, ...patch };
    try {
      await writeJson(configPath(c.store), c.cfg);
    } catch {
      /* a read-only settings mount: the choice just will not be remembered */
    }
  }, []);

  const reloadFor = useCallback(async (s: Store) => {
    setLoading(true);
    try {
      setEvents(await loadAllEvents(s));
    } catch (e) {
      setNotice(describe(e, 'Could not read the calendar.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const activate = useCallback(
    async (s: Store) => {
      setStore(s);
      if (s.mode === 'rw') {
        try {
          await ensureDir(eventsDir(s)); // so members' polls have a directory to watch from day one
        } catch {
          /* read-only after all; polling copes with a missing dir too */
        }
      }
      await reloadFor(s);
      setPhase('ready');
    },
    [reloadFor],
  );

  // ── boot ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfgStore = await openPrivateStore('');
        const cfg = await readJson<CalendarConfig>(configPath(cfgStore), {});
        cfgRef.current = { store: cfgStore, cfg };
        if (!alive) return;
        if (cfg.mode === 'shared' && cfg.spaceId) {
          const s = await openRememberedSpace(cfg.spaceId);
          if (!alive) return;
          if (s) {
            await activate(s);
            return;
          }
          setNotice('The shared calendar from last time is no longer available. Pick one to continue.');
          setPhase('choose');
          return;
        }
        if (cfg.mode === 'private') {
          await activate(await openPrivateStore('calendar'));
          return;
        }
        setPhase('choose');
      } catch (e) {
        if (!alive) return;
        setNotice(describe(e, 'Could not open your private storage.'));
        setPhase('choose');
      }
    })();
    return () => {
      alive = false;
    };
  }, [activate]);

  // ── polling (shared stores get no remote watch events) ───────────────────
  useEffect(() => {
    if (phase !== 'ready' || !store || store.kind === 'settings') return;
    const onChange = () => void reloadFor(store);
    const stopMonth = pollDir(monthDir(store, visibleMonth), onChange, 3000);
    const stopRoot = pollDir(eventsDir(store), onChange, 3000);
    return () => {
      stopMonth();
      stopRoot();
    };
  }, [phase, store, visibleMonth, reloadFor]);

  // ── choosing / switching the store ───────────────────────────────────────
  const createShared = useCallback(async () => {
    try {
      const s = await createSharedStore('Calendar');
      await writeConfig({ mode: 'shared', spaceId: s.spaceId, spaceName: s.name });
      await activate(s);
    } catch (e) {
      if (codeOf(e) === 'cancelled') return;
      setNotice(describe(e, 'Could not create a shared calendar.'));
    }
  }, [activate, writeConfig]);

  const openShared = useCallback(async () => {
    try {
      const s = await pickSharedStore();
      await writeConfig({ mode: 'shared', spaceId: s.spaceId, spaceName: s.name });
      await activate(s);
    } catch (e) {
      if (codeOf(e) === 'cancelled') return;
      setNotice(describe(e, 'Could not open a shared calendar.'));
    }
  }, [activate, writeConfig]);

  const usePrivate = useCallback(async () => {
    try {
      const s = await openPrivateStore('calendar');
      if (!cfgRef.current?.cfg.seeded && s.mode === 'rw') {
        const existing = await loadAllEvents(s);
        if (existing.length === 0) {
          for (const ev of sampleEvents(today(), login)) await saveEvent(s, ev);
        }
      }
      await writeConfig({ mode: 'private', seeded: true, spaceId: undefined, spaceName: undefined });
      await activate(s);
    } catch (e) {
      setNotice(describe(e, 'Could not open your private calendar.'));
    }
  }, [activate, login, writeConfig]);

  const chooseStore = useCallback(() => setPhase('choose'), []);

  // ── mutations ────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (store) await reloadFor(store);
  }, [store, reloadFor]);

  const save = useCallback(
    async (ev: CalendarEvent, previousDate?: string) => {
      if (!store) return false;
      try {
        await saveEvent(store, ev, previousDate);
        setEvents((prev) => [...prev.filter((e) => e.id !== ev.id), ev]);
        return true;
      } catch (e) {
        setNotice(describe(e, 'Could not save the event.'));
        return false;
      }
    },
    [store],
  );

  const remove = useCallback(
    async (ev: CalendarEvent) => {
      if (!store) return false;
      try {
        await deleteEvent(store, ev);
        setEvents((prev) => prev.filter((e) => e.id !== ev.id));
        return true;
      } catch (e) {
        setNotice(describe(e, 'Could not delete the event.'));
        return false;
      }
    },
    [store],
  );

  const upload = useCallback(
    async (eventId: string, file: File) => {
      if (!store) return null;
      try {
        return await uploadAttachment(store, eventId, file);
      } catch (e) {
        setNotice(describe(e, `Could not upload ${file.name}.`));
        return null;
      }
    },
    [store],
  );

  const link = useCallback(
    async (source: 'this' | 'another') => {
      if (!store) return null;
      try {
        return await linkFileFromSpace(store, source);
      } catch (e) {
        setNotice(describe(e, 'Could not link a file.'));
        return null;
      }
    },
    [store],
  );

  const unlinkAttachment = useCallback(
    async (att: Attachment) => {
      if (store) await removeAttachmentBytes(store, att);
    },
    [store],
  );

  const discardAttachments = useCallback(
    async (eventId: string) => {
      if (store) await removeDir(attachmentsDir(store, eventId));
    },
    [store],
  );

  return {
    phase,
    store,
    events,
    loading,
    notice,
    readOnly: store?.mode === 'ro',
    login,
    createShared,
    openShared,
    usePrivate,
    chooseStore,
    reload,
    save,
    remove,
    upload,
    link,
    unlinkAttachment,
    discardAttachments,
    setNotice,
    setVisibleMonth,
  };
}
