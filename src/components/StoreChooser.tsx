import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

/** First-run screen. Shared is the point of this app, so the two shared options
 *  come first; private works with zero prompts. */
function StoreChooser({
  onCreate,
  onOpen,
  onPrivate,
  canGoBack,
  onBack,
}: {
  onCreate: () => void;
  onOpen: () => void;
  onPrivate: () => void;
  canGoBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="chooser">
      <div className="chooser-top">
        <div className="brand">
          <span className="mark" />
          Shared calendar
        </div>
        <ThemeSwitch />
      </div>
      <h1>
        One calendar, <span className="grad-text">everyone's</span> plans.
      </h1>
      <p className="deck">
        Events are plain files in a space, so a family or a team edits the same calendar and each day can carry
        photos and documents.
      </p>
      <div className="options">
        <button type="button" className="option" onClick={onCreate}>
          <span className="oi"><Icon name="users" size={22} /></span>
          <strong>Create a shared calendar</strong>
          <span>Makes a new space named “Calendar”. You then share that space with people from the platform's Spaces page.</span>
        </button>
        <button type="button" className="option" onClick={onOpen}>
          <span className="oi"><Icon name="calendar" size={22} /></span>
          <strong>Open an existing one</strong>
          <span>Pick a space someone already shared with you (or one of your own) and use it as the calendar.</span>
        </button>
        <button type="button" className="option" onClick={onPrivate}>
          <span className="oi"><Icon name="lock" size={22} /></span>
          <strong>Keep it private</strong>
          <span>Just for you, stored in your private app folder. Comes with a few sample events. Switch to shared any time.</span>
        </button>
      </div>
      <p className="fine">
        Sharing itself happens in immediately.run's Spaces UI — this app cannot invite people, it only reads and
        writes the space you grant it.
      </p>
      {canGoBack && (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <Icon name="left" size={16} /> Back to the calendar
        </button>
      )}
    </div>
  );
}

export default StoreChooser;
