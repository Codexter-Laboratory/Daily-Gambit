import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Panel } from '../../components';
import type { GameRecord } from '../../lib/gameRecords';
import {
  ENDING_LABELS,
  activityLevel,
  buildActivityGrid,
  gameEndings,
  resultsByColor,
  scoreByOpponentStrength,
  scorePct,
  topOpenings,
  type WDL,
} from './insights';

type InsightProps = {
  points: GameRecord[] | null;
  loading: boolean;
};

const fmt = (n: number) => n.toLocaleString();
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Shared loading / empty handling, so every insight card behaves the same way. */
function InsightPanel({
  title,
  loading,
  points,
  skeletonHeight = 180,
  children,
}: InsightProps & { title: string; skeletonHeight?: number; children: (points: GameRecord[]) => ReactNode }) {
  if (!points && loading) {
    return (
      <Panel title={title}>
        <span className="srOnly" role="status">Loading {title.toLowerCase()}…</span>
        <div className="skeleton" style={{ height: skeletonHeight, borderRadius: 10 }} />
      </Panel>
    );
  }
  return (
    <Panel title={title} busy={loading && points !== null}>
      {!points ? (
        <div className="muted insightEmpty">Couldn&apos;t load games. Try refreshing.</div>
      ) : points.length === 0 ? (
        <div className="muted insightEmpty">No games in this category and period.</div>
      ) : (
        children(points)
      )}
    </Panel>
  );
}

/** Win / draw / loss as one stacked bar, with a 2px gap between segments. */
export function ResultBar({ wdl, height = 12 }: { wdl: WDL; height?: number }) {
  const parts = [
    { key: 'win', n: wdl.win, label: 'wins' },
    { key: 'draw', n: wdl.draw, label: 'draws' },
    { key: 'loss', n: wdl.loss, label: 'losses' },
  ].filter((p) => p.n > 0);
  return (
    <div
      className="resultBar"
      style={{ height }}
      role="img"
      aria-label={`${pct(wdl.win, wdl.games)}% wins, ${pct(wdl.draw, wdl.games)}% draws, ${pct(wdl.loss, wdl.games)}% losses`}
    >
      {parts.map((p) => (
        <span
          key={p.key}
          className={`resultSeg resultSeg-${p.key}`}
          style={{ flexGrow: p.n }}
          title={`${fmt(p.n)} ${p.label} (${pct(p.n, wdl.games)}%)`}
        />
      ))}
    </div>
  );
}

export function ResultLegend() {
  return (
    <div className="chartLegend" aria-hidden="true">
      <span><i className="key key-win" />Win</span>
      <span><i className="key key-draw" />Draw</span>
      <span><i className="key key-loss" />Loss</span>
    </div>
  );
}

// ---------- Activity heatmap ----------

const GAP = 3;
const MIN_CELL = 9;
const MAX_CELL = 18;
const LEFT = 30;
const RIGHT_PAD = 16; // room for the last month label
const TOP = 18;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDay(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function ActivityHeatmap({ points, loading, months }: InsightProps & { months: number }) {
  const grid = useMemo(() => (points ? buildActivityGrid(points, months) : null), [points, months]);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  // Size cells to the card: short periods fill it, long ones keep a readable size and scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [points]);
  // Long periods scroll sideways; start at the most recent weeks, like a timeline.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [grid, boxWidth]);

  return (
    <InsightPanel title="Activity" points={points} loading={loading} skeletonHeight={140}>
      {() => {
        if (!grid) return null;
        const cols = grid.weeks.length;
        const fit = boxWidth ? Math.floor((boxWidth - LEFT - RIGHT_PAD) / cols) - GAP : 12;
        const CELL = Math.max(MIN_CELL, Math.min(MAX_CELL, fit));
        const STEP = CELL + GAP;
        const width = LEFT + cols * STEP + RIGHT_PAD;
        const height = TOP + 7 * STEP;
        const monthLabels: { x: number; label: string }[] = [];
        grid.weeks.forEach((week, i) => {
          const first = week.find((d) => d && d.date.endsWith('-01') ) ?? (i === 0 ? week.find(Boolean) : null);
          if (first) {
            const m = Number(first.date.slice(5, 7)) - 1;
            const x = LEFT + i * STEP;
            if (!monthLabels.length || x - monthLabels[monthLabels.length - 1].x > 28) {
              monthLabels.push({ x, label: MONTHS[m] });
            }
          }
        });

        return (
          <>
            <p className="insightSummary">
              <strong>{fmt(grid.totalGames)}</strong> games on <strong>{fmt(grid.activeDays)}</strong> days
              {grid.busiest ? (
                <>
                  {' '}· busiest day {formatDay(grid.busiest.date)} with <strong>{fmt(grid.busiest.games)}</strong>
                </>
              ) : null}
              {' '}· longest run of playing days: <strong>{grid.longestStreak}</strong>
            </p>
            <div className="heatmapScroll" ref={scrollRef} onMouseLeave={() => setHover(null)}>
              <svg
                className="heatmap"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`Games per day over the last ${months} months. ${grid.totalGames} games on ${grid.activeDays} days.`}
              >
                {monthLabels.map((m) => (
                  <text key={m.x} x={m.x} y={11} className="heatmapLabel">{m.label}</text>
                ))}
                {['Mon', 'Wed', 'Fri'].map((d, i) => (
                  <text key={d} x={0} y={TOP + (i * 2) * STEP + CELL - 2} className="heatmapLabel">{d}</text>
                ))}
                {grid.weeks.map((week, wi) =>
                  week.map((day, di) =>
                    day ? (
                      <rect
                        key={day.date}
                        x={LEFT + wi * STEP}
                        y={TOP + di * STEP}
                        width={CELL}
                        height={CELL}
                        rx={2}
                        className={`heatCell heat-${activityLevel(day.games, grid.thresholds)}`}
                        onMouseEnter={(e) => {
                          const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect();
                          const r = e.currentTarget.getBoundingClientRect();
                          setHover({
                            x: r.left - box.left + CELL / 2 + (e.currentTarget.ownerSVGElement?.parentElement?.scrollLeft ?? 0),
                            y: r.top - box.top,
                            text: day.games
                              ? `${formatDay(day.date)}: ${day.games} game${day.games === 1 ? '' : 's'} · ${day.win}W ${day.draw}D ${day.loss}L`
                              : `${formatDay(day.date)}: no games`,
                          });
                        }}
                      >
                        <title>
                          {day.games ? `${day.date}: ${day.games} games (${day.win}W ${day.draw}D ${day.loss}L)` : `${day.date}: no games`}
                        </title>
                      </rect>
                    ) : null
                  )
                )}
              </svg>
              {hover ? (
                <div className="chartTip" style={{ left: hover.x, top: hover.y }} role="presentation">
                  {hover.text}
                </div>
              ) : null}
            </div>
            <div className="heatLegend" aria-hidden="true">
              Fewer
              {[0, 1, 2, 3, 4, 5].map((l) => (
                <i key={l} className={`heatCell heat-${l}`} />
              ))}
              More
            </div>
          </>
        );
      }}
    </InsightPanel>
  );
}

// ---------- Results by colour ----------

export function ResultsByColor({ points, loading }: InsightProps) {
  return (
    <InsightPanel title="Results by colour" points={points} loading={loading} skeletonHeight={120}>
      {(pts) => {
        const byColor = resultsByColor(pts);
        return (
          <>
            {(['white', 'black'] as const).map((color) => {
              const t = byColor[color];
              return (
                <div key={color} className="colorRow">
                  <div className="colorRowHead">
                    <span className={`pieceDot pieceDot-${color}`} aria-hidden="true" />
                    <strong>As {color === 'white' ? 'White' : 'Black'}</strong>
                    <span className="muted">{fmt(t.games)} games</span>
                    <span className="colorRowScore">{t.games ? `${scorePct(t)}% score` : '–'}</span>
                  </div>
                  {t.games ? (
                    <>
                      <ResultBar wdl={t} height={16} />
                      <div className="colorRowNums muted">
                        {pct(t.win, t.games)}% won · {pct(t.draw, t.games)}% drawn · {pct(t.loss, t.games)}% lost
                      </div>
                    </>
                  ) : (
                    <div className="muted colorRowNums">No games as {color}.</div>
                  )}
                </div>
              );
            })}
            <ResultLegend />
          </>
        );
      }}
    </InsightPanel>
  );
}

// ---------- Score against opponent strength ----------

export function OpponentStrength({ points, loading }: InsightProps) {
  return (
    <InsightPanel title="Score by opponent strength" points={points} loading={loading} skeletonHeight={200}>
      {(pts) => {
        const buckets = scoreByOpponentStrength(pts);
        return (
          <>
            <p className="insightSummary muted">Opponent rating compared with yours, at the time of each game.</p>
            <div className="hbarList">
              {buckets.map((b) => {
                const score = scorePct(b);
                return (
                  <div key={b.label} className="hbarRow" title={b.games ? `${b.win}W ${b.draw}D ${b.loss}L` : undefined}>
                    <span className="hbarLabel">{b.label}</span>
                    <span className="hbarTrack">
                      {score !== null ? <span className="hbarFill hbarFill-accent" style={{ width: `${Math.max(score, 1)}%` }} /> : null}
                      {b.expectedPct !== null ? (
                        <span className="hbarExpected" style={{ left: `${b.expectedPct}%` }} title={`Expected ${b.expectedPct}%`} />
                      ) : null}
                    </span>
                    <span className="hbarValue">
                      {score !== null ? <strong>{score}%</strong> : <span className="muted">–</span>}
                      <span className="muted"> · {fmt(b.games)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="chartLegend" aria-hidden="true">
              <span><i className="key key-accent" />Your score</span>
              <span><i className="key key-expected" />Expected from the rating gap</span>
            </div>
          </>
        );
      }}
    </InsightPanel>
  );
}

// ---------- How games end ----------

const ENDING_GROUPS = [
  { key: 'win', title: 'Wins' },
  { key: 'loss', title: 'Losses' },
  { key: 'draw', title: 'Draws' },
] as const;

export function GameEndings({ points, loading }: InsightProps) {
  return (
    <InsightPanel title="How games end" points={points} loading={loading} skeletonHeight={240}>
      {(pts) => {
        const groups = gameEndings(pts);
        return (
          <div className="endingGroups">
            {ENDING_GROUPS.map(({ key, title }) => {
              const g = groups[key];
              if (!g.total) return null;
              return (
                <div key={key}>
                  <div className="endingGroupTitle">
                    {title} <span className="muted">{fmt(g.total)}</span>
                  </div>
                  <div className="hbarList">
                    {g.rows.map((r) => (
                      <div key={r.ending} className="hbarRow">
                        <span className="hbarLabel">{ENDING_LABELS[r.ending]}</span>
                        <span className="hbarTrack">
                          <span className={`hbarFill hbarFill-${key}`} style={{ width: `${Math.max(pct(r.count, g.total), 1)}%` }} />
                        </span>
                        <span className="hbarValue">
                          <strong>{pct(r.count, g.total)}%</strong>
                          <span className="muted"> · {fmt(r.count)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }}
    </InsightPanel>
  );
}

// ---------- Openings ----------

export function TopOpenings({ points, loading }: InsightProps) {
  const [color, setColor] = useState<'white' | 'black'>('white');
  return (
    <InsightPanel title="Top openings" points={points} loading={loading} skeletonHeight={240}>
      {(pts) => {
        const rows = topOpenings(pts, color);
        return (
          <>
            <div className="segmented" role="tablist" aria-label="Openings played as">
              {(['white', 'black'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={color === c}
                  className={color === c ? 'segBtn segBtnOn' : 'segBtn'}
                  onClick={() => setColor(c)}
                >
                  As {c === 'white' ? 'White' : 'Black'}
                </button>
              ))}
            </div>
            {rows.length === 0 ? (
              <div className="muted insightEmpty">No opening data for games as {color}.</div>
            ) : (
              <table className="openingTable">
                <thead>
                  <tr>
                    <th>Opening</th>
                    <th className="num">Games</th>
                    <th>Results</th>
                    <th className="num">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.name}>
                      <td className="openingName" title={r.name}>{r.name}</td>
                      <td className="num">{fmt(r.games)}</td>
                      <td className="openingBar"><ResultBar wdl={r} /></td>
                      <td className="num"><strong>{scorePct(r)}%</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <ResultLegend />
          </>
        );
      }}
    </InsightPanel>
  );
}
