import { useState } from 'react';
import { Panel } from '../../components';

type Profile = {
  avatar?: string;
  username: string;
  name?: string;
  title?: string;
  player_id: string;
  location?: string;
  joined: number;
  followers: number;
  status: string;
  fide?: number;
  is_streamer?: boolean;
  twitch_url?: string;
  last_online: number;
  url?: string;
};

type PlayerProfileSectionProps = {
  profileLoading: boolean;
  profile: Profile | null;
  onlineStatus: { online: boolean } | null;
};

function Avatar({ profile }: { profile: Profile }) {
  const [failed, setFailed] = useState(false);
  if (!profile.avatar || failed) {
    return (
      <div className="avatar avatarFallback" aria-hidden="true">
        {profile.username.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      className="avatar"
      src={profile.avatar}
      alt={`${profile.username} avatar`}
      onError={() => setFailed(true)}
    />
  );
}

export function PlayerProfileSection({
  profileLoading,
  profile,
  onlineStatus,
}: PlayerProfileSectionProps) {
  if (profileLoading || !profile) {
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

  const profileUrl = profile.url ?? `https://www.chess.com/member/${profile.username}`;

  return (
    <Panel>
      <div className="profileCard">
        <Avatar profile={profile} />
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
                  : `Last seen ${new Date(profile.last_online * 1000).toLocaleDateString()}`}
              </span>
            ) : null}
            {profile.location ? <span>📍 {profile.location}</span> : null}
            <span>📅 Joined {new Date(profile.joined * 1000).toLocaleDateString()}</span>
            <span>👥 {profile.followers.toLocaleString()} followers</span>
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
