export type DateISO = string; // YYYY-MM-DD

export type PuzzleRushPoint = {
  date: DateISO;
  attemptsTotal: number | null;
  scoreTotal: number | null;
  attemptsDelta: number | null;
  scoreDelta: number | null;
};

export type StreakSummary = {
  current: number;
  best: number;
  endingDate: DateISO | null;
};

function toUTCDate(iso: DateISO): Date {
  return new Date(iso + 'T00:00:00.000Z');
}

function isoFromUTCDate(d: Date): DateISO {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(iso: DateISO, days: number): DateISO {
  const t = toUTCDate(iso).getTime() + days * 86400000;
  return isoFromUTCDate(new Date(t));
}

function computeBestStreakFromActive(activeByDate: Map<DateISO, boolean>, start: DateISO, end: DateISO) {
  let best = 0;
  let current = 0;
  for (let day = start; day <= end; day = addDaysUTC(day, 1)) {
    const isActive = activeByDate.get(day) === true;
    if (isActive) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function computeCurrentEndingAt(activeByDate: Map<DateISO, boolean>, end: DateISO): number {
  let streak = 0;
  for (let day = end; ; day = addDaysUTC(day, -1)) {
    const isActive = activeByDate.get(day) === true;
    if (!isActive) return streak;
    streak += 1;
  }
}

export function computePuzzleRushActivityStreak(
  points: PuzzleRushPoint[],
  today: DateISO = isoFromUTCDate(new Date())
): StreakSummary {
  if (points.length === 0) return { current: 0, best: 0, endingDate: null };

  // Active day definition: the attempts total went up since the previous snapshot.
  // The very first snapshot has nothing to compare with (delta is null), so it is NOT counted.
  // It used to count whenever the total was above zero, which gave every new player a free
  // "1 day" streak even if they had not played at all.
  const activeByDate = new Map<DateISO, boolean>();
  for (const p of points) {
    activeByDate.set(p.date, typeof p.attemptsDelta === 'number' && p.attemptsDelta > 0);
  }

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0].date;
  const end = sorted[sorted.length - 1].date;

  const best = computeBestStreakFromActive(activeByDate, start, end);

  // The current streak is measured against TODAY, not against the last saved snapshot.
  // Counting back from the last snapshot made a streak that ended weeks ago still show as
  // current. Today may simply not be saved yet, so a streak that ended yesterday is still alive.
  const countFrom = activeByDate.get(today) === true ? today : addDaysUTC(today, -1);
  const current = computeCurrentEndingAt(activeByDate, countFrom);

  return { current, best, endingDate: end };
}

export function computeDailyPuzzleCalendarStreak(
  solvedByDate: Map<DateISO, boolean>
): StreakSummary {
  const dates = [...solvedByDate.keys()].sort((a, b) => a.localeCompare(b));
  if (dates.length === 0) return { current: 0, best: 0, endingDate: null };

  const start = dates[0];
  const end = dates[dates.length - 1];

  const best = computeBestStreakFromActive(solvedByDate, start, end);
  const current = computeCurrentEndingAt(solvedByDate, end);

  return { current, best, endingDate: end };
}

