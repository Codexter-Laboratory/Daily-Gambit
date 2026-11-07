'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalyzedGame } from '@daily-gambit/core';
import type { JobEvent, JobProgress } from '@daily-gambit/contracts';
import type { AnalysisProgress, AnalysisStatus, PlayerAnalysis, RunOptions } from './analysisTypes';
import { ApiError, cancelJob, createJob, fetchStored, openJobEvents } from './apiClient';

const REFRESH_DEBOUNCE_MS = 400;

const toProgress = (p: JobProgress): AnalysisProgress => ({ done: p.done, total: p.total, currentFraction: p.inFlight });
const toStatus = (p: JobProgress): AnalysisStatus => (p.phase === 'fetching' ? 'loading-games' : 'analyzing');

/**
 * Analysis on the server: asks the API to queue a job, follows its live progress, and reads the
 * stored results. Results live in the database, so they are there on any device.
 */
export function useServerAnalysis(username: string): PlayerAnalysis {
  const [games, setGames] = useState<AnalyzedGame[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<{ id: string; stop: () => void } | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const stored = await fetchStored(username);
      if (alive.current) setGames(stored.games);
    } catch (e) {
      if (alive.current && !(e instanceof DOMException)) setError(e instanceof ApiError ? e.message : 'Could not load your analysis.');
    }
  }, [username]);

  const refreshSoon = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    alive.current = true;
    void refresh().finally(() => alive.current && setCacheReady(true));
    return () => {
      alive.current = false;
      jobRef.current?.stop();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  const finish = useCallback(
    (next: AnalysisStatus, message: string | null = null) => {
      jobRef.current?.stop();
      jobRef.current = null;
      setStatus(next);
      setError(message);
      if (next !== 'error') setProgress(null);
      void refresh();
    },
    [refresh]
  );

  const onEvent = useCallback(
    (event: JobEvent) => {
      if (!alive.current) return;
      if (event.type === 'status') {
        if (event.status.progress) {
          setProgress(toProgress(event.status.progress));
          setStatus(toStatus(event.status.progress));
        }
      } else if (event.type === 'progress') {
        setProgress(toProgress(event.progress));
        setStatus(toStatus(event.progress));
        if (event.progress.finishedGameId) refreshSoon();
      } else if (event.type === 'done') finish('done');
      else if (event.type === 'cancelled') finish('cancelled');
      else finish('error', event.message);
    },
    [finish, refreshSoon]
  );

  const run = useCallback(
    async ({ limit, timeClass }: RunOptions) => {
      if (jobRef.current) return;
      setError(null);
      setProgress(null);
      setStatus('loading-games');
      try {
        const { jobId } = await createJob({ username, limit, timeClass });
        jobRef.current = { id: jobId, stop: openJobEvents(jobId, onEvent) };
      } catch (e) {
        setStatus('error');
        setError(e instanceof ApiError ? e.message : 'Could not start the analysis.');
      }
    },
    [username, onEvent]
  );

  const cancel = useCallback(() => {
    const job = jobRef.current;
    if (job) void cancelJob(job.id).catch(() => undefined); // the stream reports the cancellation
  }, []);

  const running = status === 'loading-games' || status === 'starting-engine' || status === 'analyzing';
  return { games, cacheReady, status, running, progress, error, run, cancel };
}
