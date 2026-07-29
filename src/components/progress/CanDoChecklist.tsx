import React from 'react';
import { CheckCircle2, CircleDashed, CircleDot } from 'lucide-react';
import {
  CAN_DO_STATUS_LABEL,
  canDoTone,
  type CanDoProgressRow,
  type CanDoStatus,
} from '@/lib/growth';

export interface ChecklistEntry {
  canDoId: string;
  statement: string;
  framework: string;
  level: string;
  skillOrMode: string;
  status: CanDoStatus | 'not-started';
  nAttempts: number;
  nCorrect: number;
}

const ICONS: Record<string, React.ElementType> = {
  met: CheckCircle2,
  approaching: CircleDot,
  practiced: CircleDashed,
  'not-started': CircleDashed,
};

/** Can-do checklist (WIDA + NCSSFL-ACTFL) with practiced / approaching / met status. */
const CanDoChecklist: React.FC<{ entries: ChecklistEntry[] }> = ({ entries }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No can-do statements linked yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const Icon = ICONS[e.status] ?? CircleDashed;
        const label =
          e.status === 'not-started'
            ? 'Not started'
            : CAN_DO_STATUS_LABEL[e.status as CanDoStatus];
        return (
          <li key={e.canDoId} className="flex items-start gap-3 rounded-md border p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{e.statement}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.framework} · {e.skillOrMode} · Level {e.level}
                {e.nAttempts > 0 && ` · ${e.nCorrect}/${e.nAttempts} correct`}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                e.status === 'not-started'
                  ? 'bg-muted text-muted-foreground border-border'
                  : canDoTone(e.status as CanDoStatus)
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/** Merges the full framework with the student's observed progress rows. */
export function buildChecklist(
  statements: Array<{ id: string; framework: string; skill_or_mode: string; level: string; statement: string }>,
  progress: CanDoProgressRow[],
): ChecklistEntry[] {
  const byId = new Map(progress.map((p) => [p.can_do_id, p]));
  return statements.map((s) => {
    const p = byId.get(s.id);
    return {
      canDoId: s.id,
      statement: s.statement,
      framework: s.framework,
      level: s.level,
      skillOrMode: s.skill_or_mode,
      status: (p?.status ?? 'not-started') as ChecklistEntry['status'],
      nAttempts: p?.n_attempts ?? 0,
      nCorrect: p?.n_correct ?? 0,
    };
  });
}

export default CanDoChecklist;
