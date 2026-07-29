import React from 'react';
import { CAN_DO_STATUS_LABEL, canDoTone, type CanDoProgressRow, type CanDoStatus } from '@/lib/growth';

interface HeatmapProps {
  students: Array<{ id: string; name: string }>;
  canDos: Array<{ id: string; statement: string }>;
  progress: CanDoProgressRow[];
}

const SHORT: Record<string, string> = { met: 'M', approaching: 'A', practiced: 'P' };

/**
 * Students x can-dos mastery grid. Each cell carries a letter and an accessible
 * title, so status never depends on colour alone.
 */
const CanDoHeatmap: React.FC<HeatmapProps> = ({ students, canDos, progress }) => {
  const key = new Map(progress.map((p) => [`${p.user_id}|${p.can_do_id}`, p.status]));

  if (students.length === 0 || canDos.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough roster evidence for a heatmap yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Can-do mastery by student. M = met, A = approaching, P = practiced, dash = not started.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-background p-2 text-left font-medium">
              Student
            </th>
            {canDos.map((c, i) => (
              <th key={c.id} scope="col" className="p-2 text-xs font-medium" title={c.statement}>
                C{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t">
              <th scope="row" className="sticky left-0 bg-background p-2 text-left font-normal">
                {s.name}
              </th>
              {canDos.map((c) => {
                const status = key.get(`${s.id}|${c.id}`) as CanDoStatus | undefined;
                const label = status ? CAN_DO_STATUS_LABEL[status] : 'Not started';
                return (
                  <td key={c.id} className="p-1 text-center">
                    <span
                      title={`${s.name} — ${label}: ${c.statement}`}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded border text-xs font-semibold ${
                        status ? canDoTone(status) : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      <span className="sr-only">{label}</span>
                      <span aria-hidden>{status ? SHORT[status] : '–'}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ol className="mt-4 space-y-1 text-xs text-muted-foreground">
        {canDos.map((c, i) => (
          <li key={c.id}>
            <strong>C{i + 1}</strong> — {c.statement}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default CanDoHeatmap;
