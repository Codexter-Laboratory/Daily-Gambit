import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  FreshQuerySchema,
  GamesQuerySchema,
  USERNAME_RE,
  type ClubsResponse,
  type CurrentGamesPayload,
  type GamesSeries,
  type MatchesResponse,
  type OnlineStatus,
  type ProfileResponse,
  type StatsResponse,
  type TournamentsResponse,
} from '@daily-gambit/contracts';
import type { Deps } from '../server.js';

const Params = z.object({ username: z.string().regex(USERNAME_RE, 'Invalid Chess.com username.') });

/**
 * Read endpoints for a player's Chess.com data. Chess.com usernames are case-insensitive, so one
 * canonical lowercase form is used everywhere. `?fresh=1` skips the cache for that request.
 */
export function registerPlayerRoutes(app: FastifyInstance, { chessCom }: Deps) {
  const read = (req: { params: unknown; query: unknown }) => ({
    username: Params.parse(req.params).username.toLowerCase(),
    fresh: FreshQuerySchema.parse(req.query).fresh !== undefined,
  });
  // The data is public and cached upstream; browsers may reuse an answer for a few seconds.
  const send = <T>(reply: FastifyReply, body: T) => reply.header('Cache-Control', 'public, max-age=10').send(body);

  app.get('/v1/players/:username/profile', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: ProfileResponse = { username, profile: await chessCom.profile(username, { fresh }) };
    return send(reply, body);
  });

  app.get('/v1/players/:username/online', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: OnlineStatus = await chessCom.onlineStatus(username, { fresh });
    return send(reply, body);
  });

  app.get('/v1/players/:username/stats', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: StatsResponse = { username, stats: await chessCom.stats(username, { fresh }) };
    return send(reply, body);
  });

  app.get('/v1/players/:username/clubs', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: ClubsResponse = { username, clubs: await chessCom.clubs(username, { fresh }) };
    return send(reply, body);
  });

  app.get('/v1/players/:username/tournaments', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: TournamentsResponse = { username, tournaments: await chessCom.tournaments(username, { fresh }) };
    return send(reply, body);
  });

  app.get('/v1/players/:username/matches', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: MatchesResponse = { username, matches: await chessCom.matches(username, { fresh }) };
    return send(reply, body);
  });

  app.get('/v1/players/:username/current-games', async (req, reply) => {
    const { username, fresh } = read(req);
    const body: CurrentGamesPayload = { username, currentGames: await chessCom.currentGames(username, { fresh }) };
    return send(reply, body);
  });

  /** The games behind the rating, activity and results charts. */
  app.get('/v1/players/:username/games', async (req, reply) => {
    const { username, fresh } = read(req);
    const { timeClass, months } = GamesQuerySchema.parse(req.query);
    const body: GamesSeries = await chessCom.gamesSeries({ username, timeClass, months, fresh });
    return send(reply, body);
  });
}
