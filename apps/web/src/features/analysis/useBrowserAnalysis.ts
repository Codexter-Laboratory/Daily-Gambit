'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeGame, type AnalyzedGame } from '@daily-gambit/core';
import type { AnalysisGame } from '../../lib/chesscom';
import { createStockfish } from './stockfishClient';
import type { AnalysisProgress, AnalysisStatus, PlayerAnalysis, RunOptions } from './analysisTypes';
import { emptyAnalysisCache, loadAnalysisCache, saveAnalysisCache, type AnalysisCache } from './storage';

export const ANALYSIS_DEPTH = 12;

type GamesResponse = { games?: AnalysisGame[]; error?: string };

/**
 * Analysis in this browser: fetches the games, runs Stockfish in a Web Worker and keeps the results in
 * IndexedDB. Used when no API is configured, so the app still works on its own.
 */
export function useBrowserAnalysis(username: string): PlayerAnalysis {
  const [analyzed, setAnalyzed] = useState<AnalyzedGame[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<AnalysisCache>(emptyAnalysisCache());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    loadAnalysisCache(username).then((cache) => {
      if (!alive) return;
      cacheRef.current = cache;
      setAnalyzed(Object.values(cache.games));
      setCacheReady(true);
    });
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, [username]);

  const run = useCallback(
    async ({ limit, timeClass }: RunOptions) => {
      if (abortRef.current) return; // already running
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setProgress(null);
      setStatus('loading-games');
      let engine: ReturnType<typeof createStockfish> | null = null;

      try {
        const res = await fetch(`/api/analysis-games?username=${encodeURIComponent(username)}&limit=${limit}${timeClass ? `&timeClass=${timeClass}` : ''}`, { signal: controller.signal });
        const body = (await res.json().catch(() => ({}))) as GamesResponse;
        if (!res.ok) throw new Error(body.error ?? 'Could not load your games from Chess.com.');

        const cache = cacheRef.current;
        const todo = (body.games ?? []).filter((g) => !cache.games[g.id] && !cache.skipped.includes(g.id));
        if (todo.length === 0) {
          setStatus('done');
          return;
        }

        setStatus('starting-engine');
        engine = createStockfish();
        await engine.ready.catch(() => {
          throw new Error('The chess engine could not start in this browser.');
        });

        setStatus('analyzing');
        let done = 0;
        setProgress({ done, total: todo.length, currentFraction: 0 });
        for (const game of todo) {
          const analysis = await analyzeGame({ gameId: game.id, pgn: game.pgn, username }, engine, {
            depth: ANALYSIS_DEPTH,
            signal: controller.signal,
            onProgress: (d, t) => setProgress({ done, total: todo.length, currentFraction: d / t }),
          });
          if (analysis) {
            const { id, url, endTime, color, result, ending } = game;
            cache.games[id] = { meta: { id, url, endTime, timeClass: game.timeClass, color, result, ending }, analysis };
          } else {
            cache.skipped.push(game.id);
          }
          done += 1;
          setProgress({ done, total: todo.length, currentFraction: 0 });
          setAnalyzed(Object.values(cache.games));
          await saveAnalysisCache(username, cache);
        }
        setStatus('done');
      } catch (e) {
        if (controller.signal.aborted) {
          setStatus('cancelled');
        } else {
          setError(e instanceof Error ? e.message : 'Analysis failed.');
          setStatus('error');
        }
      } finally {
        engine?.dispose();
        abortRef.current = null;
      }
    },
    [username]
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const sorted = useMemo(() => [...analyzed].sort((a, b) => b.meta.endTime - a.meta.endTime), [analyzed]);
  const running = status === 'loading-games' || status === 'starting-engine' || status === 'analyzing';

  return { games: sorted, cacheReady, status, running, progress, error, run, cancel };
}
