'use client';

import Image from 'next/image';
import { useState } from 'react';

const SIZE = 84; // matches .avatar in globals.css

// next/image only optimizes hosts listed in next.config.mjs (images.remotePatterns).
// Any other host would throw, so those fall back to a plain <img>.
function isOptimizable(src: string) {
  try {
    return new URL(src).hostname === 'images.chesscomfiles.com';
  } catch {
    return false;
  }
}

/** The one client-side piece of the profile card: it needs onError to swap in the initial-letter fallback. */
export function Avatar({ src, username }: { src?: string; username: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="avatar avatarFallback" aria-hidden="true">
        {username.charAt(0).toUpperCase()}
      </div>
    );
  }

  const alt = `${username} avatar`;
  if (!isOptimizable(src)) {
    return <img className="avatar" src={src} alt={alt} onError={() => setFailed(true)} />;
  }
  // priority: this is above the fold and is usually the largest image, so it should not be lazy.
  // width and height reserve the space, which keeps the layout from jumping (CLS).
  return (
    <Image
      className="avatar"
      src={src}
      alt={alt}
      width={SIZE}
      height={SIZE}
      priority
      onError={() => setFailed(true)}
    />
  );
}
