import { EmptyState, LoadingState, Panel } from '../../components';

type Match = {
  url: string;
  name: string;
  results?: { played_as_white?: string; played_as_black?: string };
};

type MatchesData = {
  finished?: Match[];
  in_progress?: Match[];
  registered?: Match[];
};

type TeamMatchesSectionProps = {
  matchesLoading: boolean;
  matches: MatchesData | null | unknown;
  hasUsername: boolean;
};

export function TeamMatchesSection({
  matchesLoading,
  matches,
  hasUsername,
}: TeamMatchesSectionProps) {
  if (matchesLoading && !matches) {
    return <LoadingState title="Team Matches" message="Loading matches…" />;
  }

  const typedMatches = matches as MatchesData | null;
  if (!typedMatches) {
    return (
      <EmptyState
        title="Team Matches"
        busy={matchesLoading}
        message={
          hasUsername
            ? 'No team matches.'
            : 'Enter a username and click "Load Player Stats" to see team matches.'
        }
      />
    );
  }

  const hasAny =
    (typedMatches.finished?.length ?? 0) > 0 ||
    (typedMatches.in_progress?.length ?? 0) > 0 ||
    (typedMatches.registered?.length ?? 0) > 0;

  return (
    <Panel title="Team Matches" busy={matchesLoading}>
      {typedMatches.finished && typedMatches.finished.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Finished Matches ({typedMatches.finished.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Match</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>White</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Black</th>
                </tr>
              </thead>
              <tbody>
                {typedMatches.finished.slice(0, 5).map((m, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '6px 4px' }}>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                        {m.name}
                      </a>
                    </td>
                    <td style={{ padding: '6px 4px' }}>{m.results?.played_as_white ?? '-'}</td>
                    <td style={{ padding: '6px 4px' }}>{m.results?.played_as_black ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {typedMatches.in_progress && typedMatches.in_progress.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            In Progress ({typedMatches.in_progress.length})
          </div>
          {typedMatches.in_progress.map((m, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: 12 }}>
                {m.name}
              </a>
            </div>
          ))}
        </div>
      )}

      {typedMatches.registered && typedMatches.registered.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Registered ({typedMatches.registered.length})
          </div>
          {typedMatches.registered.map((m, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                backgroundColor: 'rgba(156,163,175,0.1)',
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: 12 }}>
                {m.name}
              </a>
            </div>
          ))}
        </div>
      )}

      {!hasAny && (
        <div className="muted" style={{ fontSize: 13 }}>
          No team matches.
        </div>
      )}
    </Panel>
  );
}
