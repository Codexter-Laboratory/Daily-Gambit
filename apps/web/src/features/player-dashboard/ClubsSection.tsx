import { EmptyState, LoadingState, Panel } from '../../components';

type Club = {
  icon?: string;
  name: string;
  joined: number;
  last_activity?: number;
  url: string;
};

type ClubsSectionProps = {
  clubsLoading: boolean;
  clubs: { clubs: Club[] } | null | unknown;
  hasUsername: boolean;
};

export function ClubsSection({ clubsLoading, clubs, hasUsername }: ClubsSectionProps) {
  if (clubsLoading && !clubs) {
    return <LoadingState title="Club Memberships" message="Loading clubs…" rows={2} />;
  }

  const typedClubs = clubs as { clubs: Club[] } | null;
  if (!typedClubs?.clubs?.length) {
    return (
      <EmptyState
        title="Club Memberships"
        busy={clubsLoading}
        message={
          hasUsername
            ? 'No club memberships.'
            : 'Enter a username and click "Load Player Stats" to see club memberships.'
        }
      />
    );
  }

  return (
    <Panel title={`Club Memberships (${typedClubs.clubs.length})`} busy={clubsLoading}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {typedClubs.clubs.map((club, index) => (
          <div
            key={index}
            style={{
              padding: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {club.icon && (
              <img
                src={club.icon}
                alt={club.name}
                style={{ width: 40, height: 40, borderRadius: 4 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14 }}>{club.name}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                Joined: {new Date(club.joined * 1000).toLocaleDateString()}
                {club.last_activity &&
                  ` · Active: ${new Date(club.last_activity * 1000).toLocaleDateString()}`}
              </div>
            </div>
            <a
              href={club.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#60a5fa', fontSize: 12 }}
            >
              View
            </a>
          </div>
        ))}
      </div>
    </Panel>
  );
}
