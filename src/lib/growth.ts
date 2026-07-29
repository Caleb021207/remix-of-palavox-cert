/**
 * Growth + band helpers for the progress dashboards.
 *
 * Everything here is presentation logic over server-written results.
 * No scoring, re-scoring or recalculation of proficiency happens on the client:
 * scaled scores, SEM and WIDA/CEFR bands all come from the server.
 */

export const PRACTICE_DISCLAIMER =
  'Practice / formative — not an official proficiency measure.';

/** Points of scaled-score growth we treat as a typical window-to-window target. */
export const TYPICAL_GROWTH_PER_WINDOW = 6;

/** Multiplier on the combined growth standard error before a change is "real". */
export const GROWTH_SE_MULTIPLIER = 1.5;

export interface TrendPoint {
  user_id: string;
  skill: string;
  window_id: string | null;
  window_name: string | null;
  school_year: string | null;
  window_sequence: number | null;
  window_starts_on: string | null;
  scaled_score: number;
  sem: number | null;
  wida_level: number | null;
  wida_low: number | null;
  wida_high: number | null;
  cefr_band: string | null;
  n_scored: number;
  n_correct: number;
  created_at: string;
}

export const SKILL_LABELS: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

export function skillLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill;
}

export function windowLabel(point: Pick<TrendPoint, 'window_name' | 'school_year' | 'created_at'>): string {
  if (point.window_name) {
    return point.school_year ? `${point.window_name} ${point.school_year}` : point.window_name;
  }
  return new Date(point.created_at).toLocaleDateString();
}

/**
 * Band text. Levels are ALWAYS reported as a band with a confidence range,
 * never as a bare number.
 */
export function bandText(row: {
  wida_level: number | null;
  wida_low?: number | null;
  wida_high?: number | null;
  cefr_band?: string | null;
}): string {
  if (row.wida_level === null || row.wida_level === undefined) return 'Not enough evidence yet';
  const low = row.wida_low ?? row.wida_level;
  const high = row.wida_high ?? row.wida_level;
  const spread = Math.max(row.wida_level - low, high - row.wida_level);
  const wida = `~WIDA ${row.wida_level}${spread > 0 ? ` (±${spread})` : ''}`;
  return row.cefr_band ? `${wida}, CEFR ${row.cefr_band}` : wida;
}

/** Accessible colour classes — always paired with the text label, never colour alone. */
export function bandTone(level: number | null | undefined): string {
  if (level === null || level === undefined) return 'bg-muted text-muted-foreground border-border';
  if (level <= 2) return 'bg-amber-100 text-amber-900 border-amber-300';
  if (level === 3) return 'bg-sky-100 text-sky-900 border-sky-300';
  if (level === 4) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  return 'bg-violet-100 text-violet-900 border-violet-300';
}

export type GrowthVerdict = 'real-gain' | 'real-decline' | 'within-expected' | 'insufficient';

export interface GrowthCheck {
  verdict: GrowthVerdict;
  delta: number | null;
  combinedSe: number | null;
  threshold: number | null;
  label: string;
  detail: string;
}

/**
 * SEM-aware growth flag. A change is only called "real" when it exceeds
 * ~1.5x the combined standard error of the two measurements; otherwise it is
 * explicitly reported as within the expected range of measurement noise.
 */
export function assessGrowth(
  earlier: { scaled_score: number; sem: number | null } | undefined,
  later: { scaled_score: number; sem: number | null } | undefined,
): GrowthCheck {
  if (!earlier || !later) {
    return {
      verdict: 'insufficient',
      delta: null,
      combinedSe: null,
      threshold: null,
      label: 'Needs another window',
      detail: 'At least two benchmark windows are needed before growth can be interpreted.',
    };
  }
  const delta = Number(later.scaled_score) - Number(earlier.scaled_score);
  const se1 = Number(earlier.sem ?? 0);
  const se2 = Number(later.sem ?? 0);
  const combinedSe = Math.sqrt(se1 * se1 + se2 * se2);
  const threshold = GROWTH_SE_MULTIPLIER * combinedSe;

  if (combinedSe === 0) {
    return {
      verdict: 'insufficient',
      delta,
      combinedSe,
      threshold,
      label: 'No error estimate',
      detail: 'Without a standard error of measurement this change cannot be interpreted.',
    };
  }

  if (Math.abs(delta) <= threshold) {
    return {
      verdict: 'within-expected',
      delta,
      combinedSe,
      threshold,
      label: 'Within expected range',
      detail: `Change of ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts is smaller than the ±${threshold.toFixed(1)} pts expected from measurement error.`,
    };
  }

  return {
    verdict: delta > 0 ? 'real-gain' : 'real-decline',
    delta,
    combinedSe,
    threshold,
    label: delta > 0 ? 'Growth beyond measurement error' : 'Decline beyond measurement error',
    detail: `Change of ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts exceeds the ±${threshold.toFixed(1)} pts expected from measurement error.`,
  };
}

export type CanDoStatus = 'practiced' | 'approaching' | 'met';

export interface CanDoProgressRow {
  user_id: string;
  can_do_id: string;
  statement: string;
  framework: string;
  level: string;
  skill_or_mode: string;
  n_attempts: number;
  n_correct: number;
  status: CanDoStatus;
  last_practiced_at: string;
}

export const CAN_DO_STATUS_LABEL: Record<CanDoStatus, string> = {
  practiced: 'Practiced',
  approaching: 'Approaching',
  met: 'Met',
};

export function canDoTone(status: CanDoStatus): string {
  switch (status) {
    case 'met':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'approaching':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    default:
      return 'bg-slate-100 text-slate-900 border-slate-300';
  }
}

export type ReadinessState = 'approaching' | 'on-track' | 'not-yet';

export interface ReadinessThreshold {
  id: string;
  kind: string;
  label: string;
  wida_composite_min: number | null;
  actfl_level: string | null;
  cefr_min: string | null;
  approaching_margin: number;
}

export interface ReadinessResult {
  kind: string;
  label: string;
  state: ReadinessState;
  stateLabel: string;
  composite: number | null;
  target: number | null;
  caveat: string;
}

/** Composite = mean of the latest WIDA level per skill (band midpoints). */
export function widaComposite(latestPerSkill: TrendPoint[]): number | null {
  const levels = latestPerSkill
    .map((r) => r.wida_level)
    .filter((v): v is number => v !== null && v !== undefined);
  if (levels.length === 0) return null;
  return levels.reduce((a, b) => a + b, 0) / levels.length;
}

export function assessReadiness(
  threshold: ReadinessThreshold,
  latestPerSkill: TrendPoint[],
): ReadinessResult {
  const composite = widaComposite(latestPerSkill);
  const target = threshold.wida_composite_min;
  const caveat =
    threshold.kind === 'seal_of_biliteracy'
      ? `Indicative only — Seal of Biliteracy decisions require an approved ACTFL ${threshold.actfl_level ?? 'Intermediate Mid'} assessment. ${PRACTICE_DISCLAIMER}`
      : `Indicative only — reclassification decisions require an official state assessment. ${PRACTICE_DISCLAIMER}`;

  if (composite === null || target === null) {
    return {
      kind: threshold.kind,
      label: threshold.label,
      state: 'not-yet',
      stateLabel: 'Not enough evidence',
      composite,
      target,
      caveat,
    };
  }

  if (composite >= target) {
    return {
      kind: threshold.kind,
      label: threshold.label,
      state: 'on-track',
      stateLabel: 'On track',
      composite,
      target,
      caveat,
    };
  }

  if (composite >= target - Number(threshold.approaching_margin ?? 0.5)) {
    return {
      kind: threshold.kind,
      label: threshold.label,
      state: 'approaching',
      stateLabel: 'Approaching',
      composite,
      target,
      caveat,
    };
  }

  return {
    kind: threshold.kind,
    label: threshold.label,
    state: 'not-yet',
    stateLabel: 'Building toward',
    composite,
    target,
    caveat,
  };
}

export function readinessTone(state: ReadinessState): string {
  switch (state) {
    case 'on-track':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'approaching':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    default:
      return 'bg-slate-100 text-slate-900 border-slate-300';
  }
}

/** Latest trend point per skill. */
export function latestBySkill(points: TrendPoint[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const p of points) {
    const prev = map.get(p.skill);
    if (!prev || new Date(p.created_at) > new Date(prev.created_at)) map.set(p.skill, p);
  }
  return [...map.values()];
}

/** Builds a chart series with a typical-growth target line anchored on the first window. */
export function buildGrowthSeries(points: TrendPoint[]) {
  const ordered = [...points].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const baseline = ordered[0]?.scaled_score ?? 0;
  return ordered.map((p, i) => ({
    window: windowLabel(p),
    score: Number(p.scaled_score),
    low: Math.max(0, Number(p.scaled_score) - Number(p.sem ?? 0)),
    high: Math.min(100, Number(p.scaled_score) + Number(p.sem ?? 0)),
    target: Math.min(100, Number(baseline) + i * TYPICAL_GROWTH_PER_WINDOW),
  }));
}

/** Groups students by shared unmet can-dos for small-group instruction. */
export function buildSmallGroups(
  rows: Array<{ user_id: string; can_do_id: string; statement: string; status: CanDoStatus }>,
  allStudents: string[],
  minSize = 2,
) {
  const byCanDo = new Map<string, { statement: string; students: Set<string> }>();
  for (const r of rows) {
    if (r.status === 'met') continue;
    const entry = byCanDo.get(r.can_do_id) ?? { statement: r.statement, students: new Set<string>() };
    entry.students.add(r.user_id);
    byCanDo.set(r.can_do_id, entry);
  }
  return [...byCanDo.entries()]
    .map(([canDoId, v]) => ({
      canDoId,
      statement: v.statement,
      students: [...v.students].filter((s) => allStudents.includes(s)),
    }))
    .filter((g) => g.students.length >= minSize)
    .sort((a, b) => b.students.length - a.students.length)
    .slice(0, 6);
}
