import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldQuestion } from 'lucide-react';
import { readinessTone, type ReadinessResult } from '@/lib/growth';

/** Reclassification / Seal-of-Biliteracy readiness, always with its caveat. */
const ReadinessCard: React.FC<{ results: ReadinessResult[] }> = ({ results }) => {
  if (results.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Readiness indicators</CardTitle>
        <p className="text-sm text-muted-foreground">
          Directional signals from practice evidence only — never a placement decision.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.map((r) => (
          <div key={r.kind} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{r.label}</p>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${readinessTone(r.state)}`}
              >
                {r.stateLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {r.composite !== null
                ? `Practice composite ~${r.composite.toFixed(1)}`
                : 'Practice composite not available'}
              {r.target !== null && ` · target ${Number(r.target).toFixed(1)}`}
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {r.caveat}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ReadinessCard;
