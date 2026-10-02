import { EmptyState, LoadingState, Panel } from '../../components';
import { getMyColor, getOpponentUsername } from './gameUtils';

type Game = Record<string, unknown> & {
  time_class: string;
  turn: string;
  last_activity?: number;
  move_by?: number;
};

type CurrentGamesTableProps = {
  currentGamesLoading: boolean;
  currentGames: { games: Game[] } | null | unknown;
  username: string;
  hasUsername: boolean;
};

export function CurrentGamesTable({
  currentGamesLoading,
  currentGames,
  username,
  hasUsername,
}: CurrentGamesTableProps) {
  if (currentGamesLoading && !currentGames) {
    return <LoadingState title="Current Games" message="Loading current games…" />;
  }

  const typedGames = (currentGames as { games: Game[] } | null) ?? null;
  if (!typedGames?.games?.length) {
    return (
      <EmptyState
        title="Current Games"
        busy={currentGamesLoading}
        message={
          hasUsername
            ? 'No active games right now.'
            : 'Enter a username and click "Load Player Stats" to see current games.'
        }
      />
    );
  }

  const currentUsername = username.trim();

  return (
    <Panel title={`Current Games (${typedGames.games.length})`} busy={currentGamesLoading}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              <th style={{ padding: '8px 6px' }}>Opponent</th>
              <th style={{ padding: '8px 6px' }}>Time Control</th>
              <th style={{ padding: '8px 6px' }}>Turn</th>
              <th style={{ padding: '8px 6px' }}>Move By</th>
            </tr>
          </thead>
          <tbody>
            {typedGames.games.map((game, index) => {
              const myColor = getMyColor(game, currentUsername);
              const opponent = getOpponentUsername(game, currentUsername);
              const turnColor = game.turn.charAt(0).toUpperCase() + game.turn.slice(1);
              const turnPlayer = game.turn === myColor ? 'You' : opponent;
              const turnDisplay = `${turnColor} to move (${turnPlayer})`;

              const moveByText = game.last_activity
                ? `Last: ${new Date((game.last_activity as number) * 1000).toLocaleDateString()}`
                : game.move_by && (game.move_by as number) > 0
                  ? new Date((game.move_by as number) * 1000).toLocaleString()
                  : 'No time limit';

              return (
                <tr key={index} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 6px', color: 'rgba(255,255,255,0.9)' }}>{opponent}</td>
                  <td style={{ padding: '8px 6px' }}>
                    {game.time_class.charAt(0).toUpperCase() + game.time_class.slice(1)}
                  </td>
                  <td style={{ padding: '8px 6px' }}>{turnDisplay}</td>
                  <td style={{ padding: '8px 6px' }}>{moveByText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
