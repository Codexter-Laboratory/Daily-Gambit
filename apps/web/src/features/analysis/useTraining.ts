'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDeck, puzzleId, trainingStreak, type AnalyzedGame, type MoveError } from '@daily-gambit/core';
import { emptyTrainingLog, loadTrainingLog, saveTrainingLog, type TrainingLog } from './storage';

export const DECK_SIZE = 5;

/** The player's local calendar day, so "today" matches their own clock. */
export const localDay = (d = new Date()) => d.toLocaleDateString('en-CA');

/** Today's deck, which puzzles are solved, and the training streak. Kept in this browser. */
export function useTraining(username: string, games: AnalyzedGame[]) {
  const [log, setLog] = useState<TrainingLog>(emptyTrainingLog());
  const [loaded, setLoaded] = useState(false);
  const today = localDay();

  useEffect(() => {
    let alive = true;
    loadTrainingLog(username).then((l) => {
      if (!alive) return;
      setLog(l);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [username]);

  // The deck is built from puzzles solved on earlier days only, so it does not shrink while you play it.
  const deck: MoveError[] = useMemo(() => {
    if (!loaded) return [];
    const before = new Set(Object.entries(log.solved).filter(([, day]) => day !== today).map(([id]) => id));
    return buildDeck(games, before, today, DECK_SIZE, new Set(Object.keys(log.failed)));
    // Only rebuild when the analysed games change, never when a puzzle gets solved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, loaded, today]);

  const solvedToday = useMemo(() => new Set(deck.map(puzzleId).filter((id) => log.solved[id] === today)), [deck, log, today]);

  const markSolved = useCallback(
    (id: string) => {
      setLog((prev) => {
        if (prev.solved[id] === today) return prev;
        const { [id]: _retried, ...failed } = prev.failed;
        const next = { ...prev, solved: { ...prev.solved, [id]: today }, failed };
        void saveTrainingLog(username, next);
        return next;
      });
    },
    [username, today]
  );

  const markFailed = useCallback(
    (id: string) => {
      setLog((prev) => {
        if (prev.failed[id] || prev.solved[id]) return prev;
        const next = { ...prev, failed: { ...prev.failed, [id]: today } };
        void saveTrainingLog(username, next);
        return next;
      });
    },
    [username, today]
  );

  const days = useMemo(() => [...new Set(Object.values(log.solved))], [log]);
  const streak = trainingStreak(days, today);

  return { deck, solvedToday, markSolved, markFailed, retryCount: Object.keys(log.failed).length, streak, loaded };
}
