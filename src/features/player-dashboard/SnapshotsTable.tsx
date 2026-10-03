import { LoadingState, Panel } from '../../components';
import type { PuzzleRushPoint } from './types';

type SnapshotsTableProps = {
  points: PuzzleRushPoint[];
  loading: boolean;
};

export function SnapshotsTable({ points, loading }: SnapshotsTableProps) {
  if (loading && points.length === 0) {
    return <LoadingState title="Recent Puzzle Rush Snapshots" message="Loading snapshots…" rows={4} />;
  }

  const rows = points.slice(-10).reverse();

  return (
    <Panel title="Recent Puzzle Rush Snapshots" busy={loading}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        The 10 most recent daily snapshots. One is saved automatically each day.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'rgba(255,255,255,0.7)' }}>
              <th style={{ padding: '6px 4px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '6px 4px', textAlign: 'left' }}>Attempts</th>
              <th style={{ padding: '6px 4px', textAlign: 'left' }}>Score</th>
              <th style={{ padding: '6px 4px', textAlign: 'left' }}>Best</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((p, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '6px 4px' }}>{p.date}</td>
                  <td style={{ padding: '6px 4px' }}>
                    {typeof p.attemptsTotal === 'number' ? p.attemptsTotal : '-'}
                  </td>
                  <td style={{ padding: '6px 4px' }}>
                    {typeof p.scoreTotal === 'number' ? p.scoreTotal : '-'}
                  </td>
                  <td style={{ padding: '6px 4px' }}>
                    {typeof p.bestScore === 'number' ? p.bestScore : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '10px 6px', color: 'rgba(255,255,255,0.7)' }}>
                  No snapshots yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
