import Icon from './Icon';

function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="notice" role="alert">
      <span>{text}</span>
      <button type="button" className="iconbtn small" aria-label="Dismiss" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export default Notice;
