import { useState } from 'react';
import { Panel } from '../../components';
import type { AnalysisProgress, AnalysisStatus } from './usePlayerAnalysis';

const SIZES = [10, 20, 30] as const;

type RunPanelProps = {
  status: AnalysisStatus;
  running: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  analysedCount: number;
  cacheReady: boolean;
  onRun: (limit: number) => void;
  onCancel: () => void;
};

const STATUS_TEXT: Partial<Record<AnalysisStatus, string>> = {
  'loading-games': 'Loading your recent games from Chess.com…',
  'starting-engine': 'Starting Stockfish…',
};

export function RunPanel({ status, running, progress, error, analysedCount, cacheReady, onRun, onCancel }: RunPanelProps) {
  const [size, setSize] = useState<number>(20);
  const fraction = progress && progress.total > 0 ? (progress.done + progress.currentFraction) / progress.total : 0;

  return (
    <Panel title="Engine analysis" busy={running}>
      <div className="anRun">
        <p className="muted anRunText">
          Stockfish reviews your games on this device, move by move, and finds where you lose points. Nothing is uploaded.
          {analysedCount > 0 ? ` ${analysedCount} games analysed so far.` : ''}
        </p>

        {running ? (
          <div className="anRunActive">
            <div className="anProgress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)} aria-label="Analysis progress">
              <div className="anProgressBar" style={{ width: `${Math.max(3, Math.round(fraction * 100))}%` }} />
            </div>
            <div className="anRunRow">
              <span className="muted" role="status">
                {STATUS_TEXT[status] ?? (progress ? `Analysing game ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : 'Analysing…')}
              </span>
              <button type="button" className="btn btnGhost" onClick={onCancel}>
                Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="anRunRow">
            <label className="anSelect">
              <span className="muted">Games</span>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="How many recent games to analyse">
                {SIZES.map((n) => (
                  <option key={n} value={n}>
                    Last {n}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btnPrimary" disabled={!cacheReady} onClick={() => onRun(size)}>
              {analysedCount > 0 ? 'Analyse new games' : 'Analyse my games'}
            </button>
          </div>
        )}

        {status === 'done' && !running ? <div className="muted anNote">Up to date.</div> : null}
        {status === 'cancelled' ? <div className="muted anNote">Stopped. Finished games are kept.</div> : null}
        {error ? (
          <div className="anError" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
