import { useState } from 'react';
import type { Store } from '../lib/store';
import Icon from './Icon';

/** The popover behind the store badge: where the data lives, and the ways to
 *  move it somewhere shared. */
function StoreMenu({
  store,
  onCreate,
  onOpen,
  onPrivate,
  onClose,
  displayName,
  onDisplayName,
}: {
  store: Store;
  onCreate: () => void;
  onOpen: () => void;
  onPrivate: () => void;
  onClose: () => void;
  /** Private "Your name" setting; only used when the host gives no login. */
  displayName: string;
  onDisplayName: (name: string) => void;
}) {
  const [name, setName] = useState(displayName);
  const shared = store.kind === 'space' || (store.kind === 'dev' && !!store.spaceId);
  const pick = (fn: () => void) => () => {
    onClose();
    fn();
  };
  return (
    <div className="menu" role="menu">
      <div className="hint">
        {shared
          ? `Shared: ${store.name ?? store.spaceId ?? 'space'} · ${store.mode === 'ro' ? 'read-only for you' : 'you can edit'}`
          : 'Private: only you can see this calendar.'}
      </div>
      <button type="button" role="menuitem" onClick={pick(onCreate)}>
        <Icon name="users" size={16} /> Create a shared calendar
      </button>
      <button type="button" role="menuitem" onClick={pick(onOpen)}>
        <Icon name="calendar" size={16} /> Open a shared calendar…
      </button>
      {shared && (
        <button type="button" role="menuitem" onClick={pick(onPrivate)}>
          <Icon name="lock" size={16} /> Use my private calendar
        </button>
      )}
      <label className="hint namefield">
        Your name (shown on events you add)
        <input
          value={name}
          placeholder="e.g. Sam"
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== displayName && onDisplayName(name)}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        />
      </label>
      <div className="hint">
        To let others in, share the space itself from immediately.run's Spaces page; the app cannot invite people.
      </div>
    </div>
  );
}

export default StoreMenu;
