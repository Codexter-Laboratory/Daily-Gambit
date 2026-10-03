import { PlayerSearch } from '../../../features/player-dashboard/PlayerSearch';
import { PLAYER_NOT_FOUND_MESSAGE } from '../../../lib/username';

// Rendered when the page calls notFound(): an invalid username in the URL, or Chess.com has no such player.
export default function PlayerNotFound() {
  return (
    <div className="stack">
      <PlayerSearch initialError={PLAYER_NOT_FOUND_MESSAGE} />
    </div>
  );
}
