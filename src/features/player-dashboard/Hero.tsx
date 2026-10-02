import type { ReactNode } from 'react';

const FEATURES = [
  {
    icon: '📈',
    title: 'Rating history',
    text: 'Your rating after every game, for any time control or variant, over the last 3 to 24 months.',
  },
  {
    icon: '🔥',
    title: 'Puzzle Rush streaks',
    text: "A daily streak Chess.com doesn't track for you, built from snapshots saved each time you look yourself up.",
  },
  {
    icon: '♞',
    title: 'Live daily games',
    text: 'Every ongoing correspondence game, with the ones waiting on your move pulled to the top.',
  },
  {
    icon: '🏆',
    title: 'Clubs and events',
    text: 'Club memberships, tournament placements and team match results on one page.',
  },
];

export function Hero({ children }: { children: ReactNode }) {
  return (
    <div className="stack">
      <section className="hero">
        <h1 className="heroTitle">
          Your Chess.com profile,
          <br />
          <span className="gradient">on one page.</span>
        </h1>
        <p className="heroSubtitle">
          Enter any Chess.com username to see their ratings, rating history, Puzzle Rush streak,
          ongoing games, clubs and tournaments.
        </p>
        <div className="heroSearch">{children}</div>
      </section>

      <section className="featureGrid" aria-label="Features">
        {FEATURES.map((f) => (
          <div key={f.title} className="featureCard">
            <div className="featureIcon" aria-hidden="true">{f.icon}</div>
            <div className="featureTitle">{f.title}</div>
            <div className="featureText">{f.text}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
