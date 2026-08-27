import type { Attachment } from '../lib/types';
import AttachmentItem from './AttachmentItem';

function AttachmentList({
  attachments,
  storeRoot,
  onRemove,
}: {
  attachments: Attachment[];
  storeRoot: string;
  onRemove?: (att: Attachment) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="atts">
      {attachments.map((a) => (
        <AttachmentItem key={a.id} att={a} storeRoot={storeRoot} onRemove={onRemove ? () => onRemove(a) : undefined} />
      ))}
    </div>
  );
}

export default AttachmentList;
