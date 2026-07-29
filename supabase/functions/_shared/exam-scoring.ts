/**
 * Item-bank scoring seam.
 *
 * `scoreSession()` is deliberately the ONLY place where raw item responses are
 * turned into an ability estimate. Today it is number-correct / percent with a
 * binomial standard error of measurement; an IRT theta estimator can replace
 * the body of this function without touching any caller.
 */

export interface ScoredResponse {
  itemId: string;
  isCorrect: boolean;
  isTrial: boolean;
  widaLevel?: number | null;
}

export interface SessionScore {
  /** 0–100 scaled ability score (number-correct percent for now). */
  scaledScore: number;
  /** Standard error of measurement on the same 0–100 scale. */
  sem: number;
  nScored: number;
  nCorrect: number;
  /** Set once an IRT model replaces the number-correct estimator. */
  theta: number | null;
  method: string;
}

export function scoreSession(responses: ScoredResponse[]): SessionScore {
  const scored = responses.filter((r) => !r.isTrial);
  const n = scored.length;
  const nCorrect = scored.filter((r) => r.isCorrect).length;

  if (n === 0) {
    return { scaledScore: 0, sem: 0, nScored: 0, nCorrect: 0, theta: null, method: "number-correct-v1" };
  }

  const p = nCorrect / n;
  const scaledScore = Math.round(p * 1000) / 10;
  // Binomial SEM, expressed on the 0–100 scale, floored so a short form is
  // never reported as more precise than it really is.
  const sem = Math.max(5, Math.round(Math.sqrt((p * (1 - p)) / n) * 1000) / 10);

  return {
    scaledScore,
    sem,
    nScored: n,
    nCorrect,
    theta: null,
    method: "number-correct-v1",
  };
}

export interface CutScoreRow {
  skill: string;
  wida_level: number;
  min_scaled: number;
  max_scaled: number;
  cefr_band: string;
}

export interface LevelBand {
  widaLevel: number | null;
  widaLow: number | null;
  widaHigh: number | null;
  cefrBand: string | null;
  /** Human-readable band, e.g. "~WIDA 3 (±1), CEFR A2–B1". */
  label: string;
}

function levelFor(cuts: CutScoreRow[], score: number): CutScoreRow | null {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    cuts.find((c) => clamped >= Number(c.min_scaled) && clamped <= Number(c.max_scaled)) ?? null
  );
}

/** Maps a scaled score + SEM onto a WIDA band and CEFR range using cut scores. */
export function mapToBand(cuts: CutScoreRow[], score: number, sem: number): LevelBand {
  const sorted = [...cuts].sort((a, b) => Number(a.min_scaled) - Number(b.min_scaled));
  const center = levelFor(sorted, score);
  if (!center) {
    return { widaLevel: null, widaLow: null, widaHigh: null, cefrBand: null, label: "Not enough evidence" };
  }

  const lowRow = levelFor(sorted, score - sem) ?? center;
  const highRow = levelFor(sorted, score + sem) ?? center;
  const low = Math.min(lowRow.wida_level, center.wida_level);
  const high = Math.max(highRow.wida_level, center.wida_level);

  const cefrParts = [lowRow.cefr_band, highRow.cefr_band];
  const cefrLow = cefrParts[0].split("–")[0];
  const cefrHigh = cefrParts[1].split("–").slice(-1)[0];
  const cefrBand = cefrLow === cefrHigh ? cefrLow : `${cefrLow}–${cefrHigh}`;

  const spread = Math.max(center.wida_level - low, high - center.wida_level);
  const label = `~WIDA ${center.wida_level}${spread > 0 ? ` (±${spread})` : ""}, CEFR ${cefrBand}`;

  return {
    widaLevel: center.wida_level,
    widaLow: low,
    widaHigh: high,
    cefrBand,
    label,
  };
}
