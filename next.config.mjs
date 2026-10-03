/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // next/image only optimizes images from hosts listed here. Chess.com serves avatars from this one.
    remotePatterns: [{ protocol: 'https', hostname: 'images.chesscomfiles.com', pathname: '/**' }],
  },
};

export default nextConfig;
