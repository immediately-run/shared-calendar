import type { Attachment } from '../lib/types';
import { attachmentKind, fmtSize } from '../lib/attachments';
import { useFileUrl } from '../hooks/useFileUrl';
import { useLinkedFile } from '../hooks/useLinkedFile';
import Icon from './Icon';

const NO_REF = { $cap: 'file', mountId: '', relPath: '', mode: 'ro' } as const;

/** A thumbnail (images) or an open/download card (everything else). Uploaded
 *  files read straight from the store; linked files first resolve their
 *  content reference (an explicit click, since the host may ask for consent). */
function AttachmentItem({
  att,
  storeRoot,
  onRemove,
}: {
  att: Attachment;
  storeRoot: string;
  onRemove?: () => void;
}) {
  const linked = useLinkedFile(att.kind === 'ref' ? att.ref : NO_REF);
  let root: string | null = null;
  let rel: string | null = null;
  if (att.kind === 'file') {
    root = storeRoot;
    rel = att.relPath;
  } else if (linked.path) {
    const cut = linked.path.lastIndexOf('/');
    root = linked.path.slice(0, cut) || '/';
    rel = linked.path.slice(cut + 1);
  }
  const { url, loading, error } = useFileUrl(root, rel, att.kind === 'file' ? att.type : undefined);
  const kind = attachmentKind(att);
  const needsResolve = att.kind === 'ref' && !linked.path;

  return (
    <div className={`att k-${kind}`}>
      {kind === 'image' && url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
          <img src={url} alt={att.name} />
        </a>
      ) : (
        <div className="ph">
          {needsResolve ? (
            <Icon name="link" size={26} />
          ) : loading || linked.resolving ? (
            <span className="spin" aria-label="Loading" />
          ) : (
            <Icon name={kind === 'image' ? 'image' : 'file'} size={26} />
          )}
        </div>
      )}
      <div className="an" title={att.name}>
        {att.name}
      </div>
      <div className="am">
        {att.kind === 'file' ? fmtSize(att.size) : `linked${att.space ? ` · ${att.space}` : ''}`}
      </div>
      <div className="al">
        {needsResolve ? (
          <button type="button" onClick={linked.resolve} disabled={linked.resolving}>
            {linked.resolving ? 'Opening…' : 'Show'}
          </button>
        ) : url ? (
          <>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={12} /> Open
            </a>
            <a href={url} download={att.name}>
              <Icon name="download" size={12} /> Save
            </a>
          </>
        ) : null}
        {onRemove && (
          <button type="button" className="rm" onClick={onRemove}>
            <Icon name="trash" size={12} /> Remove
          </button>
        )}
      </div>
      {(error || linked.error) && <div className="ae">{linked.error ?? error}</div>}
    </div>
  );
}

export default AttachmentItem;
