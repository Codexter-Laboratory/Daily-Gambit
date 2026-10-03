import { NextResponse } from 'next/server';
import { saveSnapshot } from '../../../lib/snapshots';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    return NextResponse.json({ ok: true, ...(await saveSnapshot(username)) });
  } catch (e) {
    return errorResponse(e, 'Failed to ingest.');
  }
}
