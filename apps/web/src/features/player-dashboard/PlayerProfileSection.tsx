import { Panel } from '../../components';
import type { OnlineStatus, PlayerProfile } from '../../lib/chesscom';
import { Avatar } from './Avatar';

type PlayerProfileSectionProps = {
  profile: PlayerProfile;
  onlineStatus: OnlineStatus | null;
};

// A fixed locale and time zone: this renders on the server, so the text must not depend on
// the server's settings (or differ from what a browser would print).
function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Placeholder with the same footprint as the card, shown while the page streams in (see loading.tsx). */
export function PlayerProfileSkeleton() {
  return (
    <Panel>
      <div className="profileCard">
        <div className="avatar skeleton" />
        <div style={{ flex: 1, display: 'grid', gap: 10 }}>
          <div className="skeleton" style={{ height: 20, width: 200 }} />
          <div className="skeleton" style={{ width: 320, maxWidth: '100%' }} />
        </div>
      </div>
    </Panel>
  );
}

/** Shown instead of the profile card when Chess.com is not responding. The rest of the page still loads. */
export function PlayerProfileUnavailable({ username }: { username: string }) {
  return (
    <Panel>
      <div className="profileCard">
        <div className="avatar avatarFallback" aria-hidden="true">
          {username.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="profileName">@{username}</div>
          <div className="profileMeta">
            <span>Chess.com is not responding, so the profile is unavailable right now.</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** A Server Component: it ships no JavaScript of its own (only Avatar is a client component). */
export function PlayerProfileSection({ profile, onlineStatus }: PlayerProfileSectionProps) {
  const profileUrl = profile.url ?? `https://www.chess.com/member/${profile.username}`;

  return (
    <Panel>
      <div className="profileCard">
        <Avatar src={profile.avatar} username={profile.username} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="profileName">
            {profile.title ? <span className="titleBadge">{profile.title}</span> : null}
            {profile.name || profile.username}
          </div>
          <div className="profileMeta">
            <span>@{profile.username}</span>
            {onlineStatus ? (
              <span>
                <span
                  className="statusDot"
                  style={{ backgroundColor: onlineStatus.online ? 'var(--good)' : 'var(--faint)' }}
                />
                {onlineStatus.online
                  ? 'Online now'
                  : `Last seen ${formatDate(profile.last_online)}`}
              </span>
            ) : null}
            {profile.location ? <span>📍 {profile.location}</span> : null}
            <span>📅 Joined {formatDate(profile.joined)}</span>
            <span>👥 {profile.followers.toLocaleString('en-US')} followers</span>
            {profile.fide ? <span>🏆 FIDE {profile.fide}</span> : null}
            <span style={{ textTransform: 'capitalize' }}>⭐ {profile.status.replace(/_/g, ' ')}</span>
            {profile.is_streamer && profile.twitch_url ? (
              <a href={profile.twitch_url} target="_blank" rel="noopener noreferrer">
                🎮 Streamer
              </a>
            ) : null}
          </div>
        </div>
        <a className="btn" href={profileUrl} target="_blank" rel="noopener noreferrer">
          View on Chess.com ↗
        </a>
      </div>
    </Panel>
  );
}
