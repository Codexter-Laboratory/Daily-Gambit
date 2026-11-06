import type { GamesTimeClass } from './types';
import { TIME_CLASS_OPTIONS } from './GamesRatingChart';

export const LOOKBACK_OPTIONS: [number, string][] = [
  [3, '3 months'],
  [6, '6 months'],
  [12, '1 year'],
  [24, '2 years'],
  [36, '3 years'],
];

type GamesFiltersProps = {
  timeClass: GamesTimeClass;
  months: number;
  disabled?: boolean;
  onChange: (timeClass: GamesTimeClass, months: number) => void;
};

/** One filter row above every games chart; changing it re-renders all of them from the same games. */
export function GamesFilters({ timeClass, months, disabled, onChange }: GamesFiltersProps) {
  return (
    <div className="sectionHead">
      <h2 className="sectionTitle">Games</h2>
      <div className="filterRow">
        <label>
          <span className="muted">Category</span>
          <select value={timeClass} disabled={disabled} onChange={(e) => onChange(e.target.value as GamesTimeClass, months)}>
            {TIME_CLASS_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="muted">Period</span>
          <select value={months} disabled={disabled} onChange={(e) => onChange(timeClass, Number(e.target.value))}>
            {LOOKBACK_OPTIONS.map(([m, label]) => (
              <option key={m} value={m}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
