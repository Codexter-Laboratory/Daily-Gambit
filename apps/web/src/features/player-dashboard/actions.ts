'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { playerTag } from '../../lib/chesscom';
import { saveSnapshot } from '../../lib/snapshots';
import { USERNAME_RE, normalizeUsername } from '../../lib/username';

export type ActionResult = { ok: true } | { ok: false; error: string };

const usernameInput = z.string().transform(normalizeUsername).pipe(z.string().regex(USERNAME_RE));

/**
 * Saves today's Puzzle Rush snapshot. Replaces the old GET /api/ingest: a write belongs behind a
 * POST, and Next checks the Origin header on Server Actions.
 *
 * A Server Action is a public endpoint. Anyone can call it with any argument, so the input is
 * validated here. The app has no accounts, so there is no auth check; the worst a caller can do
 * is save one row per player per day, which is what the page does anyway.
 */
export async function ingestSnapshot(rawUsername: unknown): Promise<ActionResult> {
  const parsed = usernameInput.safeParse(rawUsername);
  if (!parsed.success) return { ok: false, error: 'Invalid username.' };
  try {
    await saveSnapshot(parsed.data);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save the snapshot.' };
  }
}

/**
 * The Refresh button: save the snapshot, then expire everything cached for this player
 * (every Chess.com response tagged with playerTag, and the cached page that used them).
 * updateTag expires immediately, so the same response carries the fresh page back.
 */
export async function refreshPlayer(rawUsername: unknown): Promise<ActionResult> {
  const parsed = usernameInput.safeParse(rawUsername);
  if (!parsed.success) return { ok: false, error: 'Invalid username.' };
  const result = await ingestSnapshot(parsed.data);
  updateTag(playerTag(parsed.data));
  return result;
}
