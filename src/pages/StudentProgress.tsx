import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Target } from 'lucide-react';
import BandBadge from '@/components/progress/BandBadge';
import GrowthChart from '@/components/progress/GrowthChart';
import CanDoChecklist, { buildChecklist, type ChecklistEntry } from '@/components/progress/CanDoChecklist';
import ReadinessCard from '@/components/progress/ReadinessCard';
import {
  assessGrowth,
  assessReadiness,
  latestBySkill,
  PRACTICE_DISCLAIMER,
  skillLabel,
  type CanDoProgressRow,
  type ReadinessThreshold,
  type TrendPoint,
} from '@/lib/growth';
import {
  fetchCanDoProgress,
  fetchCanDoStatements,
  fetchReadinessThresholds,
  fetchSkillTrend,
} from '@/services/progress/progressService';

/** Student-facing longitudinal dashboard. Read-only: all values come from the server. */
const StudentProgress: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [progress, setProgress] = useState<CanDoProgressRow[]>([]);
  const [statements, setStatements] = useState<
    Array<{ id: string; framework: string; skill_or_mode: string; level: string; statement: string }>
  >([]);
  const [thresholds, setThresholds] = useState<ReadinessThreshold[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [t, p, s, th] = await Promise.all([
        fetchSkillTrend(user.id),
        fetchCanDoProgress([user.id]),
        fetchCanDoStatements(),
        fetchReadinessThresholds(),
      ]);
      if (cancelled) return;
      setTrend(t);
      setProgress(p);
      setStatements(s);
      setThresholds(th);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const skills = useMemo(() => [...new Set(trend.map((t) => t.skill))].sort(), [trend]);
  const latest = useMemo(() => latestBySkill(trend), [trend]);

  const checklist: ChecklistEntry[] = useMemo(
    () => buildChecklist(statements, progress),
    [statements, progress],
  );

  const nextSteps = useMemo(() => {
    const approaching = checklist.filter((c) => c.status === 'approaching');
    const practiced = checklist.filter((c) => c.status === 'practiced');
    const fresh = checklist.filter((c) => c.status === 'not-started');
    return [...approaching, ...practiced, ...fresh].slice(0, 3);
  }, [checklist]);

  const readiness = useMemo(
    () => thresholds.map((t) => assessReadiness(t, latest)),
    [thresholds, latest],
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <header>
          <h1 className="text-3xl font-bold">My progress</h1>
          <p className="text-muted-foreground">{PRACTICE_DISCLAIMER}</p>
        </header>

        {loading ? (
          <p className="text-muted-foreground">Loading your progress…</p>
        ) : trend.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No practice results yet. Complete a practice form and your levels, can-dos and growth
              will appear here.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current level by skill</CardTitle>
                <CardDescription>
                  Levels are reported as a band with a confidence range, never a single number.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {latest.map((row) => (
                  <div key={row.skill} className="rounded-md border p-4">
                    <p className="font-medium">{skillLabel(row.skill)}</p>
                    <div className="mt-2">
                      <BandBadge row={row} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.n_correct}/{row.n_scored} scored items
                      {row.sem !== null && ` · measurement error ±${Number(row.sem).toFixed(1)} pts`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {skills.map((skill) => {
              const points = trend.filter((t) => t.skill === skill);
              const growth = assessGrowth(points[points.length - 2], points[points.length - 1]);
              return (
                <Card key={skill}>
                  <CardHeader>
                    <CardTitle className="text-lg">{skillLabel(skill)} growth over time</CardTitle>
                    <CardDescription>{growth.label} — {growth.detail}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GrowthChart skill={skill} points={points} />
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next steps</CardTitle>
                <CardDescription>Concrete can-do targets to aim for next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No targets available yet.</p>
                ) : (
                  nextSteps.map((n) => (
                    <div key={n.canDoId} className="flex items-start gap-3 rounded-md border p-3">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div>
                        <p className="text-sm">{n.statement}</p>
                        <p className="text-xs text-muted-foreground">
                          {n.framework} · {n.skillOrMode} · Level {n.level}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <ReadinessCard results={readiness} />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can-do checklist</CardTitle>
                <CardDescription>
                  WIDA and NCSSFL-ACTFL statements marked practiced, approaching or met from your
                  practice evidence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CanDoChecklist entries={checklist} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default StudentProgress;
