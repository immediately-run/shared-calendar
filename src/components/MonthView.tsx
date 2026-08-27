import type { EventInstance } from '../lib/types';
import { WEEKDAYS, dayNumber, monthOf } from '../lib/dates';

const MAX_CHIPS = 3;

/** The month grid. `compact` (phones) shows colored dots instead of chips and
 *  hands the tap to the day sheet. */
function MonthView({
  month,
  rows,
  byDate,
  selected,
  today,
  compact,
  onSelect,
  onOpen,
}: {
  month: string;
  rows: string[][];
  byDate: Map<string, EventInstance[]>;
  selected: string;
  today: string;
  compact: boolean;
  onSelect: (day: string) => void;
  onOpen: (i: EventInstance) => void;
}) {
  return (
    <div className={`month${compact ? ' compact' : ''}`}>
      <div className="head">
        {WEEKDAYS.map((d) => (
          <span key={d}>{compact ? d[0] : d}</span>
        ))}
      </div>
      <div className="grid" role="grid">
        {rows.flat().map((day) => {
          const items = byDate.get(day) ?? [];
          const cls = [
            'cell',
            monthOf(day) !== month ? 'out' : '',
            day === today ? 'today' : '',
            day === selected ? 'sel' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={day}
              className={cls}
              role="gridcell"
              tabIndex={0}
              aria-label={`${day}, ${items.length} events`}
              onClick={() => onSelect(day)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(day))}
            >
              <span className="n">{dayNumber(day)}</span>
              {compact ? (
                <span className="dots">
                  {items.slice(0, 4).map((i) => (
                    <span key={i.key} className={`dot c-${i.event.color}`} />
                  ))}
                  {items.length > 4 && <span className="more">+{items.length - 4}</span>}
                </span>
              ) : (
                <>
                  {items.slice(0, MAX_CHIPS).map((i) => (
                    <span
                      key={i.key}
                      className={`chip c-${i.event.color}`}
                      title={i.event.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(day);
                        onOpen(i);
                      }}
                    >
                      {!i.event.allDay && i.event.start && <span className="ct">{i.event.start}</span>}
                      {i.event.title}
                    </span>
                  ))}
                  {items.length > MAX_CHIPS && <span className="more">+{items.length - MAX_CHIPS} more</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
