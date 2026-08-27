// An object URL for a file under a store root — the thing an opaque-origin iframe
// needs to show an image or offer a download, since mount paths cannot be fetched.
// The SDK's `useObjectUrl` (which reads through the host's sandbox filesystem
// port) is the primary path; under plain `vite dev` that port does not exist and
// the hook reports `unavailable`, so we fall back to the bridged `fs` module.
import { useEffect, useMemo, useState } from 'react';
import fs from 'fs';
import { useObjectUrl } from '@immediately-run/sdk/hooks';
import type { SandboxMount } from '@immediately-run/sdk/mounts';

export interface FileUrlState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', svg: 'image/svg+xml', bmp: 'image/bmp', pdf: 'application/pdf',
  txt: 'text/plain', md: 'text/markdown', mdx: 'text/markdown', csv: 'text/csv', json: 'application/json',
};
export const mimeFor = (name: string): string => MIME[(name.split('.').pop() ?? '').toLowerCase()] ?? 'application/octet-stream';

/** Object URL for `<root>/<relPath>`; idle when either is null. Revoked on change/unmount. */
export function useFileUrl(root: string | null, relPath: string | null, type?: string): FileUrlState {
  // `useObjectUrl` only reads `mount.path`, so a store root doubles as a mount.
  const mount = useMemo<SandboxMount | null>(() => (root ? { path: root, type: 'store' } : null), [root]);
  const mime = type ?? (relPath ? mimeFor(relPath) : undefined);
  const sdk = useObjectUrl(mount, relPath, mime ? { type: mime } : undefined);
  const needFallback = Boolean(root && relPath && sdk.error && sdk.error.code === 'unavailable');

  // Fallback state is tagged with the (root, relPath) it belongs to, so a change of
  // target reads as "idle/loading" by derivation — no state reset inside the effect.
  const key = root && relPath ? `${root}/${relPath}` : null;
  const [fb, setFb] = useState<{ key: string; url: string | null; error: string | null }>({ key: '', url: null, error: null });
  useEffect(() => {
    if (!needFallback || !key) return;
    let alive = true;
    let url: string | null = null;
    fs.promises
      .readFile(key)
      .then((bytes) => {
        if (!alive) return;
        url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
        setFb({ key, url, error: null });
      })
      .catch((e: unknown) => {
        if (alive) setFb({ key, url: null, error: (e as Error)?.message || 'Could not read the file.' });
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [needFallback, key, mime]);

  if (needFallback) {
    const current = fb.key === key ? fb : null;
    return { url: current?.url ?? null, loading: !current, error: current?.error ?? null };
  }
  return { url: sdk.url, loading: sdk.loading, error: sdk.error ? sdk.error.message : null };
}
