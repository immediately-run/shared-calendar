// Resolves a stored content reference (a file linked from a space) to the
// absolute path the host mounts it at for THIS viewer. Resolution can raise a
// host consent prompt, so it is explicit (`resolve()`), never automatic on
// render; successful resolutions are cached so re-renders never re-prompt.
import { useCallback, useState } from 'react';
import type { FileCap } from '@immediately-run/sdk/tasks';
import { LinkError, resolveLinkedFile } from '../lib/linkFile';

const cache = new Map<string, string>();
const keyOf = (ref: FileCap) => `${ref.mountId}::${ref.relPath}`;

export interface LinkedFileState {
  /** Absolute path once resolved (split into root + name for `useFileUrl`). */
  path: string | null;
  resolving: boolean;
  error: string | null;
  resolve(): void;
}

export function useLinkedFile(ref: FileCap): LinkedFileState {
  const [path, setPath] = useState<string | null>(() => cache.get(keyOf(ref)) ?? null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(() => {
    const cached = cache.get(keyOf(ref));
    if (cached) {
      setPath(cached);
      return;
    }
    setResolving(true);
    setError(null);
    resolveLinkedFile(ref)
      .then((p) => {
        cache.set(keyOf(ref), p);
        setPath(p);
      })
      .catch((e: unknown) => {
        const le = e instanceof LinkError ? e : null;
        setError(le?.code === 'cancelled' ? 'Not shown: you declined, or the file is gone.' : le?.message || 'Could not open the linked file.');
      })
      .finally(() => setResolving(false));
  }, [ref]);

  return { path, resolving, error, resolve };
}
