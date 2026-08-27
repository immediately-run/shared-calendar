import type { ReactNode } from 'react';
import type { Store } from '../lib/store';
import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

export type View = 'month' | 'week' | 'day';

function TopBar({
  title,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  onNew,
  canWrite,
  store,
  menuOpen,
  onToggleMenu,
  menu,
}: {
  title: string;
  view: View;
  onView: (v: View) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  canWrite: boolean;
  store: Store;
  menuOpen: boolean;
  onToggleMenu: () => void;
  menu: ReactNode;
}) {
  const shared = store.kind === 'space' || (store.kind === 'dev' && !!store.spaceId);
  const views: View[] = ['month', 'week', 'day'];
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" />
        <span className="brand-name">Shared calendar</span>
      </div>
      <div className="storewrap">
        <button
          type="button"
          className={`storebadge${shared ? ' shared' : ''}`}
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Icon name={shared ? 'users' : 'lock'} size={14} />
          <span>{shared ? store.name ?? 'Shared' : 'Private'}</span>
          {store.mode === 'ro' && <span className="ro">read-only</span>}
        </button>
        {menuOpen && menu}
      </div>
      <div className="topbar-right">
        <ThemeSwitch />
      </div>

      <div className="nav">
        <button type="button" className="iconbtn" aria-label="Previous" onClick={onPrev}>
          <Icon name="left" />
        </button>
        <button type="button" className="btn btn-ghost small" onClick={onToday}>
          Today
        </button>
        <button type="button" className="iconbtn" aria-label="Next" onClick={onNext}>
          <Icon name="right" />
        </button>
        <h2 className="title">{title}</h2>
      </div>
      <div className="seg" role="tablist" aria-label="View">
        {views.map((v) => (
          <button key={v} type="button" role="tab" aria-pressed={view === v} aria-selected={view === v} onClick={() => onView(v)}>
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      {canWrite && (
        <button type="button" className="btn btn-primary small newbtn" onClick={onNew}>
          <Icon name="plus" size={16} /> New event
        </button>
      )}
    </header>
  );
}

export default TopBar;
