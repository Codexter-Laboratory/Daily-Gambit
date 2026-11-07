import { EmptyState, LoadingState, Panel } from '../../components';

type Tournament = {
  url: string;
  name?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  placement?: number;
  total_players?: number;
  status?: string;
};

type TournamentsData = {
  finished?: Tournament[];
  in_progress?: Tournament[];
  registered?: Tournament[];
};

type TournamentsSectionProps = {
  tournamentsLoading: boolean;
  tournaments: TournamentsData | null | unknown;
  hasUsername: boolean;
};

export function TournamentsSection({
  tournamentsLoading,
  tournaments,
  hasUsername,
}: TournamentsSectionProps) {
  if (tournamentsLoading && !tournaments) {
    return <LoadingState title="Tournament History" message="Loading tournaments…" />;
  }

  const typedTournaments = tournaments as TournamentsData | null;
  if (!typedTournaments) {
    return (
      <EmptyState
        title="Tournament History"
        busy={tournamentsLoading}
        message={
          hasUsername
            ? 'No tournament history.'
            : 'Enter a username and click "Load Player Stats" to see tournament history.'
        }
      />
    );
  }

  const hasAny =
    (typedTournaments.finished?.length ?? 0) > 0 ||
    (typedTournaments.in_progress?.length ?? 0) > 0 ||
    (typedTournaments.registered?.length ?? 0) > 0;

  return (
    <Panel title="Tournament History" busy={tournamentsLoading}>
      {typedTournaments.finished && typedTournaments.finished.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Finished Tournaments ({typedTournaments.finished.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Result</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Placement</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Players</th>
                </tr>
              </thead>
              <tbody>
                {typedTournaments.finished.slice(0, 5).map((t, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '6px 4px' }}>
                      <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                        {t.name || 'Tournament'}
                      </a>
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      W: {t.wins ?? 0} / L: {t.losses ?? 0} / D: {t.draws ?? 0}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      {t.placement ? `#${t.placement}` : '-'}
                    </td>
                    <td style={{ padding: '6px 4px' }}>{t.total_players ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {typedTournaments.in_progress && typedTournaments.in_progress.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            In Progress ({typedTournaments.in_progress.length})
          </div>
          {typedTournaments.in_progress.map((t, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: 12 }}>
                {t.name || 'Tournament'} · Status: {t.status}
              </a>
            </div>
          ))}
        </div>
      )}

      {typedTournaments.registered && typedTournaments.registered.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Registered ({typedTournaments.registered.length})
          </div>
          {typedTournaments.registered.map((t, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                backgroundColor: 'rgba(156,163,175,0.1)',
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: 12 }}>
                {t.name || 'Tournament'} · Status: {t.status}
              </a>
            </div>
          ))}
        </div>
      )}

      {!hasAny && (
        <div className="muted" style={{ fontSize: 13 }}>
          No tournament history.
        </div>
      )}
    </Panel>
  );
}
