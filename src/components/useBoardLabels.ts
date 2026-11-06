'use client';

import { useEffect } from 'react';

const PIECE_NAMES: Record<string, string> = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

/**
 * The chessboard library renders every draggable piece as an unnamed button, which a screen
 * reader announces as just "button". This names each one ("white knight on f3") and keeps the
 * names up to date as pieces move.
 *
 * Takes the element itself (from a callback ref held in state), so it still works when the
 * board only mounts after the first render.
 */
export function useBoardLabels(root: HTMLElement | null) {
  useEffect(() => {
    if (!root) return;
    const label = () => {
      root.querySelectorAll<HTMLElement>('[aria-roledescription="draggable"]').forEach((el) => {
        const piece = el.querySelector<HTMLElement>('[data-piece]')?.dataset.piece;
        const square = el.closest<HTMLElement>('[data-square]')?.dataset.square;
        if (!piece || !square) return;
        el.setAttribute('aria-label', `${piece[0] === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece[1]] ?? 'piece'} on ${square}`);
      });
    };
    label();
    const observer = new MutationObserver(label);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [root]);
}
