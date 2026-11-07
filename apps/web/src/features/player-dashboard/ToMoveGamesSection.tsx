import { EmptyState, LoadingState, Panel } from '../../components';

type Game = Record<string, unknown> & { url?: string; move_by?: number; draw_offer?: boolean };

type ToMoveGamesSectionProps = {
  toMoveGamesLoading: boolean;
  toMoveGames: { games: Game[] } | null | unknown;
  hasUsername: boolean;
};

export function ToMoveGamesSection({
  toMoveGamesLoading,
  toMoveGames,
  hasUsername,
}: ToMoveGamesSectionProps) {
  if (toMoveGamesLoading && !toMoveGames) {
    return (
      <LoadingState
        title="Games Requiring Your Move"
        message="Loading games requiring your move…"
      />
    );
  }

  const typedToMove = toMoveGames as { games: Game[] } | null;
  if (!typedToMove?.games?.length) {
    return (
      <EmptyState
        title="Games Requiring Your Move"
        busy={toMoveGamesLoading}
        message={
          hasUsername
            ? 'Great! No games need your immediate attention. 🎉'
            : 'Enter a username and click "Load Player Stats" to see games requiring your move.'
        }
      />
    );
  }

  return (
    <Panel title={`Games Requiring Your Move (${typedToMove.games.length})`} busy={toMoveGamesLoading}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        These games need your immediate attention
      </div>
      {typedToMove.games.map((game, index) => (
        <div
          key={index}
          style={{
            padding: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            marginBottom: 8,
            backgroundColor: 'rgba(34,197,94,0.1)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
            <a
              href={game.url as string}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#60a5fa' }}
            >
              View Game
            </a>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Move by:{' '}
            {(game.move_by as number) > 0
              ? new Date((game.move_by as number) * 1000).toLocaleString()
              : 'No time limit'}
            {game.draw_offer && ' · Draw offer received'}
          </div>
        </div>
      ))}
    </Panel>
  );
}
