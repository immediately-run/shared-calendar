// "Link a file from a space" — mechanism (b) of the attachment story. This
// composes two platform pieces the way SPACES_UI_SPEC §4 lays them out:
//   1. the host POWERBOX grants a space to this app (`requestMount`), and
//   2. the `pick-file` TASK navigates within roots we already hold (`capDir`).
// The picker never grants: `invokeTask('pick-file', {})` with no `roots` is a
// caller bug by contract (the result's `root` index must fall inside
// `params.roots`), so a root is always supplied. What we persist on the event is a
// content REFERENCE (`makeContentRef`) — a `{mountId, relPath}` pointer that every
// later viewer resolves through their own consent (`resolveContentRef`).
//
// All SDK calls here need the host; under plain `vite dev` they reject and the UI
// says so instead of pretending. `@immediately-run/sdk/tasks` is imported LAZILY:
// it registers a task-input listener at module evaluation, which throws with no
// host transport (plain `vite dev`) — the same reason the whiteboard defers it.
import { requestMount, makeContentRef, resolveContentRef } from '@immediately-run/sdk/mounts';
import type { SandboxMount } from '@immediately-run/sdk/mounts';
import type { FileCap } from '@immediately-run/sdk/tasks';
import { newId, type Store } from './store';
import type { RefAttachment } from './types';

declare const __APP_DEV__: boolean | undefined;
const isDev = () => typeof __APP_DEV__ !== 'undefined' && __APP_DEV__;

interface PickFileResult {
  root: number;
  relPath: string;
  created?: boolean;
}

export type LinkErrorCode = 'cancelled' | 'unavailable' | 'forbidden' | 'other';

export class LinkError extends Error {
  code: LinkErrorCode;
  constructor(code: LinkErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const codeOf = (e: unknown): string | undefined => (e as { code?: string } | null)?.code;
const messageOf = (e: unknown, fallback: string): string => (e as Error | null)?.message || fallback;

/** Caller-side re-validation of the picker's relPath (defense in depth — the
 *  host validates too). */
export function safeRel(rel: unknown): string | null {
  if (typeof rel !== 'string' || rel.length === 0) return null;
  if (rel.includes('\0') || rel.includes('\\') || rel.startsWith('/')) return null;
  if (rel.split('/').some((seg) => seg === '..')) return null;
  return rel;
}

const mountIdOf = (m: SandboxMount): string | null => (m.id ? `space:${m.id}` : null);

/**
 * Pick a file to link. `source: 'this'` browses the calendar's own space (no new
 * grant needed); `'another'` first asks the host powerbox for a space.
 * Returns null when the user cancels at either step.
 */
export async function linkFileFromSpace(store: Store, source: 'this' | 'another'): Promise<RefAttachment | null> {
  if (isDev()) {
    throw new LinkError('unavailable', 'Linking files needs the immediately.run host; it is not available under vite dev.');
  }

  let mount: SandboxMount | undefined;
  if (source === 'this') {
    mount = store.mount;
    if (!mount || store.kind !== 'space') {
      throw new LinkError('unavailable', 'This calendar is private. Open or create a shared calendar to link files from its space.');
    }
  } else {
    try {
      mount = await requestMount();
    } catch (e) {
      if (codeOf(e) === 'cancelled') return null;
      throw new LinkError(codeOf(e) === 'forbidden' ? 'forbidden' : 'other', messageOf(e, 'Could not open a space.'));
    }
  }
  const mountId = mountIdOf(mount);
  if (!mountId) throw new LinkError('other', 'That mount has no space id, so it cannot be referenced.');

  let res: PickFileResult;
  try {
    const { invokeTask, capDir } = await import('@immediately-run/sdk/tasks');
    res = await invokeTask<PickFileResult>('pick-file', {
      mode: 'open-file',
      roots: [capDir({ mountId, relPath: '' }, { mode: 'ro' })],
      rootLabels: [mount.name ?? 'Space'],
      rootModes: ['ro'],
      title: 'Link a file to this event',
      filters: [
        { label: 'Images', extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'] },
        { label: 'Documents', extensions: ['.pdf', '.md', '.mdx', '.txt', '.csv', '.json'] },
        { label: 'All files', extensions: [] },
      ],
    });
  } catch (e) {
    const code = codeOf(e);
    if (code === 'cancelled') return null;
    if (code === 'forbidden') {
      throw new LinkError('forbidden', 'The host refused the file picker: this app is not allowed to invoke pick-file here.');
    }
    throw new LinkError('other', messageOf(e, 'The file picker failed.'));
  }
  const rel = safeRel(res?.relPath);
  if (!rel) throw new LinkError('other', 'The picker returned a path this app will not accept.');

  return {
    kind: 'ref',
    id: newId(),
    name: rel.split('/').pop() ?? rel,
    ref: makeContentRef({ mountId, relPath: rel }, { mode: 'ro' }),
    space: mount.name,
  };
}

/** Resolve a stored reference to the absolute path it is mounted at for THIS
 *  viewer (may raise a host consent prompt). */
export async function resolveLinkedFile(ref: FileCap): Promise<string> {
  if (isDev()) throw new LinkError('unavailable', 'Linked files resolve only on the immediately.run host.');
  try {
    const { path } = await resolveContentRef(ref);
    return path;
  } catch (e) {
    const code = codeOf(e);
    throw new LinkError(
      code === 'cancelled' ? 'cancelled' : code === 'forbidden' ? 'forbidden' : 'other',
      messageOf(e, 'Could not resolve the linked file.'),
    );
  }
}
