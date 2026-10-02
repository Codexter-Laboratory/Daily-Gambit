import './globals.css';

const REPO_URL = 'https://github.com/Codexter-Laboratory/Pawn-up';

export const metadata = {
  title: 'Pawn Up · Chess.com stats dashboard',
  description:
    'Ratings, Puzzle Rush streaks, live games, clubs and tournaments for any Chess.com player, in one dashboard.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♟</text></svg>",
  },
};

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <header className="appHeader">
            <div className="appHeaderInner">
              <a className="brand" href="/">
                <span className="brandMark" aria-hidden="true">♟</span>
                Pawn Up
              </a>
              <nav className="headerNav" aria-label="Main">
                <a
                  className="headerLink"
                  href="https://www.chess.com/news/view/published-data-api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span aria-hidden="true">⚡</span>
                  <span className="label">Chess.com API</span>
                </a>
                <a className="headerLink" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <GitHubIcon />
                  <span className="label">Source</span>
                </a>
              </nav>
            </div>
          </header>
          <main className="appMain">{children}</main>
          <footer className="appFooter">
            <div className="appFooterInner">
              <span>Pawn Up · Built with Next.js, TypeScript, Prisma and Recharts</span>
              <span>
                Data from the{' '}
                <a href="https://www.chess.com/news/view/published-data-api" target="_blank" rel="noopener noreferrer">
                  Chess.com PubAPI
                </a>
                . Not affiliated with Chess.com.
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
