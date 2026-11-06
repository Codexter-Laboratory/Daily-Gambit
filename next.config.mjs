/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // The Stockfish engine (about 7 MB of WebAssembly) is copied to public/engine on install and never
        // changes between deploys of the same version, so browsers can keep it for a day and revalidate quietly.
        source: '/engine/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
  images: {
    // next/image only optimizes images from hosts listed here. Chess.com serves avatars from this one.
    remotePatterns: [{ protocol: 'https', hostname: 'images.chesscomfiles.com', pathname: '/**' }],
  },
};

export default nextConfig;
