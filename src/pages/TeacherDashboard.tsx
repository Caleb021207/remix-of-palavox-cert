import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Users } from 'lucide-react';
import BandBadge from '@/components/progress/BandBadge';
import CanDoHeatmap from '@/components/progress/CanDoHeatmap';
import ReadinessCard from '@/components/progress/ReadinessCard';
import {
  assessGrowth,
  assessReadiness,
  buildSmallGroups,
  latestBySkill,
  PRACTICE_DISCLAIMER,
  skillLabel,
  type CanDoProgressRow,
  type ReadinessThreshold,
  type TrendPoint,
} from '@/lib/growth';
import {
  fetchCanDoProgress,
  fetchReadinessThresholds,
  fetchRoster,
  fetchTeacherClasses,
  fetchTrendForStudents,
  type RosterStudent,
  type TeacherClass,
} from '@/services/progress/progressService';

const GROWTH_TONE: Record<string, string> = {
  'real-gain': 'bg-emerald-100 text-emerald-900 border-emerald-300',
  'real-decline': 'bg-rose-100 text-rose-900 border-rose-300',
  'within-expected': 'bg-slate-100 text-slate-900 border-slate-300',
  insufficient: 'bg-muted text-muted-foreground border-border',
};

/** Teacher dashboard — roster bands, SEM-aware growth flags, can-do heatmap, small groups. */
const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classId, setClassId] = useState<string>('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [progress, setProgress] = useState<CanDoProgressRow[]>([]);
  const [thresholds, setThresholds] = useState<ReadinessThreshold[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [cls, th] = await Promise.all([fetchTeacherClasses(user.id), fetchReadinessThresholds()]);
      if (cancelled) return;
      setClasses(cls);
      setThresholds(th);
      setClassId((prev) => prev || cls[0]?.id || '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    (async () => {
      const students = await fetchRoster(classId);
      if (cancelled) return;
      setRoster(students);
      const ids = students.map((s) => s.student_id);
      const [t, p] = await Promise.all([fetchTrendForStudents(ids), fetchCanDoProgress(ids)]);
      if (cancelled) return;
      setTrend(t);
      setProgress(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const nameOf = useMemo(() => {
    const map = new Map(roster.map((r) => [r.student_id, r.display_name || 'Student']));
    return (id: string) => map.get(id) ?? 'Student';
  }, [roster]);

  const skills = useMemo(() => [...new Set(trend.map((t) => t.skill))].sort(), [trend]);

  const rows = useMemo(
    () =>
      roster.map((student) => {
        const points = trend.filter((t) => t.user_id === student.student_id);
        const latest = latestBySkill(points);
        const bySkill = new Map(latest.map((l) => [l.skill, l]));
        const growth = skills.map((skill) => {
          const seq = points.filter((p) => p.skill === skill);
          return { skill, check: assessGrowth(seq[seq.length - 2], seq[seq.length - 1]) };
        });
        return { student, bySkill, growth, latest };
      }),
    [roster, trend, skills],
  );

  const heatmapCanDos = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of progress) if (!seen.has(p.can_do_id)) seen.set(p.can_do_id, p.statement);
    return [...seen.entries()].slice(0, 12).map(([id, statement]) => ({ id, statement }));
  }, [progress]);

  const smallGroups = useMemo(
    () =>
      buildSmallGroups(
        progress.map((p) => ({
          user_id: p.user_id,
          can_do_id: p.can_do_id,
          statement: p.statement,
          status: p.status,
        })),
        roster.map((r) => r.student_id),
      ),
    [progress, roster],
  );

  const classReadiness = useMemo(
    () => thresholds.map((t) => assessReadiness(t, latestBySkill(trend))),
    [thresholds, trend],
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Teacher dashboard</h1>
            <p className="text-muted-foreground">{PRACTICE_DISCLAIMER}</p>
          </div>
          {classes.length > 0 && (
            <div className="w-64">
              <label htmlFor="class-select" className="mb-1 block text-sm font-medium">
                Class
              </label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.grade_band ? ` · ${c.grade_band}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : classes.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You do not have any classes yet. Once a class and roster are created for you, your
              students' practice bands and growth flags will appear here.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Roster</CardTitle>
                <CardDescription>
                  Level bands use colour <strong>and</strong> a text label. Growth is only called
                  "real" when the change exceeds 1.5× the combined standard error.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roster.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students on this roster yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        {skills.map((s) => (
                          <TableHead key={s}>{skillLabel(s)}</TableHead>
                        ))}
                        <TableHead>Growth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(({ student, bySkill, growth }) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">
                            {student.display_name || 'Student'}
                          </TableCell>
                          {skills.map((s) => {
                            const row = bySkill.get(s);
                            return (
                              <TableCell key={s}>
                                {row ? (
                                  <BandBadge row={row} />
                                ) : (
                                  <span className="text-xs text-muted-foreground">No results</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="space-y-1">
                            {growth.map((g) => (
                              <span
                                key={g.skill}
                                title={g.check.detail}
                                className={`mr-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${GROWTH_TONE[g.check.verdict]}`}
                              >
                                {skillLabel(g.skill)}: {g.check.label}
                              </span>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can-do mastery heatmap</CardTitle>
                <CardDescription>
                  M = met, A = approaching, P = practiced, – = not started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CanDoHeatmap
                  students={roster.map((r) => ({ id: r.student_id, name: nameOf(r.student_id) }))}
                  canDos={heatmapCanDos}
                  progress={progress}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Suggested small groups</CardTitle>
                <CardDescription>Students grouped by shared unmet can-dos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {smallGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not enough shared evidence to suggest groups yet.
                  </p>
                ) : (
                  smallGroups.map((g) => (
                    <div key={g.canDoId} className="rounded-md border p-3">
                      <p className="flex items-start gap-2 text-sm font-medium">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        {g.statement}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {g.students.map(nameOf).join(', ')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <ReadinessCard results={classReadiness} />
          </>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
