import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  fetchProficiencyResults,
  type ProficiencyResultRow,
} from '@/services/test/itemBankService';

const SKILL_LABELS: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
};

function bandLabel(row: ProficiencyResultRow): string {
  if (row.wida_level === null) return 'Not enough evidence';
  const low = row.wida_low ?? row.wida_level;
  const high = row.wida_high ?? row.wida_level;
  const spread = Math.max(row.wida_level - low, high - row.wida_level);
  const wida = `~WIDA ${row.wida_level}${spread > 0 ? ` (±${spread})` : ''}`;
  return row.cefr_band ? `${wida}, CEFR ${row.cefr_band}` : wida;
}

/**
 * Shows the server-written practice bands. Everything here is read-only —
 * levels are reported as bands with a confidence range, never a bare number.
 */
const ProficiencyBands: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [rows, setRows] = useState<ProficiencyResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchProficiencyResults(sessionId);
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Practice Proficiency Bands</CardTitle>
        <p className="text-sm text-muted-foreground">
          Practice / formative — not an official proficiency measure.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
          >
            <div>
              <p className="font-medium">{SKILL_LABELS[row.skill] ?? row.skill}</p>
              <p className="text-sm text-muted-foreground">
                {bandLabel(row)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <Badge variant="secondary">
                {row.n_correct}/{row.n_scored} scored items
              </Badge>
              {row.sem !== null && (
                <p className="mt-1 text-xs">Measurement error ±{Number(row.sem).toFixed(1)} pts</p>
              )}
            </div>
          </div>
        ))}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Bands are provisional estimates from a short practice form. Unscored trial items are
          included for calibration only and never affect your result.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProficiencyBands;
