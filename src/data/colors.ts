import type { ColorKey } from '../lib/types';

/** Event color tags. The swatches themselves are CSS classes (`.c-<key>`) in
 *  App.css so they can differ per theme; this is just the vocabulary. */
export const COLORS: { key: ColorKey; label: string }[] = [
  { key: 'violet', label: 'Violet' },
  { key: 'rose', label: 'Rose' },
  { key: 'sky', label: 'Sky' },
  { key: 'mint', label: 'Mint' },
  { key: 'amber', label: 'Amber' },
  { key: 'slate', label: 'Slate' },
];
