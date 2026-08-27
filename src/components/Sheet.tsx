import { useEffect, type ReactNode } from 'react';
import Icon from './Icon';

/** A modal surface: a centered dialog on wide screens, a bottom sheet on phones
 *  (pure CSS; see `.sheet` in App.css). Escape and the backdrop close it. */
function Sheet({
  title,
  onClose,
  children,
  wide,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="sh">
          <div className="sh-title">{title}</div>
          <button type="button" className="iconbtn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="sb">{children}</div>
      </div>
    </div>
  );
}

export default Sheet;
