// Uploaded attachments: the device file's bytes are written into the store
// (`<store>/attachments/<eventId>/<name>`) with the binary `fs` API, so a photo
// or PDF becomes a plain file that any member of the space can read.
import fs from 'fs';
import { ensureDir, listFiles, newId, type Store } from './store';
import { attachmentsDir } from './events';
import type { Attachment, FileAttachment } from './types';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i;

export type FileKind = 'image' | 'pdf' | 'file';

export function fileKind(name: string, type?: string): FileKind {
  if ((type && type.startsWith('image/')) || IMAGE_EXT.test(name)) return 'image';
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  return 'file';
}

export function attachmentKind(att: Attachment): FileKind {
  return fileKind(att.name, att.kind === 'file' ? att.type : undefined);
}

/** A file name safe to store: no path separators, control characters or
 *  traversal, and never empty. */
export function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[\x00-\x1f<>:"|?*]/g, '')
    .replace(/^\.+/, '')
    .trim();
  return cleaned.slice(0, 120) || 'file';
}

const withSuffix = (name: string, n: number): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)}-${n}${name.slice(dot)}` : `${name}-${n}`;
};

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Copy a device file into the store for `eventId`. Returns the record to put
 *  on the event. */
export async function uploadAttachment(store: Store, eventId: string, file: File): Promise<FileAttachment> {
  const dir = attachmentsDir(store, eventId);
  await ensureDir(dir);
  const existing = new Set(await listFiles(dir));
  let name = sanitizeName(file.name);
  for (let n = 2; existing.has(name); n++) name = withSuffix(sanitizeName(file.name), n);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await fs.promises.writeFile(`${dir}/${name}`, bytes);
  return {
    kind: 'file',
    id: newId(),
    name,
    relPath: `attachments/${eventId}/${name}`,
    type: file.type || 'application/octet-stream',
    size: bytes.byteLength,
  };
}

export async function removeAttachmentBytes(store: Store, att: Attachment): Promise<void> {
  if (att.kind !== 'file') return;
  try {
    await fs.promises.unlink(`${store.root}/${att.relPath}`);
  } catch {
    /* already gone */
  }
}
