import { supabase } from '@/integrations/supabase/client';
import type { CanDoProgressRow, ReadinessThreshold, TrendPoint } from '@/lib/growth';

/**
 * Read-only gateway to the longitudinal progress data.
 *
 * Every query below is protected by RLS: students only ever see their own
 * rows, teachers only see students rostered into a class they own.
 */

export interface BenchmarkWindow {
  id: string;
  name: string;
  school_year: string;
  starts_on: string;
  ends_on: string;
  sequence: number;
}

export interface RosterStudent {
  student_id: string;
  display_name: string | null;
  class_id: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  grade_band: string | null;
  school_id: string | null;
}

export async function fetchBenchmarkWindows(): Promise<BenchmarkWindow[]> {
  const { data, error } = await supabase
    .from('benchmark_windows' as never)
    .select('*')
    .order('starts_on', { ascending: true });
  if (error) {
    console.warn('benchmark_windows:', error.message);
    return [];
  }
  return (data ?? []) as unknown as BenchmarkWindow[];
}

/** A student's results across every benchmark window, per skill. */
export async function fetchSkillTrend(userId: string): Promise<TrendPoint[]> {
  const { data, error } = await supabase
    .from('v_skill_trend' as never)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('v_skill_trend:', error.message);
    return [];
  }
  return (data ?? []) as unknown as TrendPoint[];
}

/** Trend rows for a whole roster (teacher view; RLS still enforces access). */
export async function fetchTrendForStudents(userIds: string[]): Promise<TrendPoint[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('v_skill_trend' as never)
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('v_skill_trend (roster):', error.message);
    return [];
  }
  return (data ?? []) as unknown as TrendPoint[];
}

export async function fetchCanDoProgress(userIds: string[]): Promise<CanDoProgressRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('v_can_do_progress' as never)
    .select('*')
    .in('user_id', userIds);
  if (error) {
    console.warn('v_can_do_progress:', error.message);
    return [];
  }
  return (data ?? []) as unknown as CanDoProgressRow[];
}

/** The full can-do framework (WIDA + NCSSFL-ACTFL) used to build the checklist. */
export async function fetchCanDoStatements(skills: string[] = []): Promise<
  Array<{ id: string; framework: string; skill_or_mode: string; level: string; statement: string }>
> {
  let query = supabase.from('can_do_statements' as never).select('*');
  if (skills.length > 0) query = query.in('skill_or_mode', skills);
  const { data, error } = await query;
  if (error) {
    console.warn('can_do_statements:', error.message);
    return [];
  }
  return (data ?? []) as unknown as Array<{
    id: string;
    framework: string;
    skill_or_mode: string;
    level: string;
    statement: string;
  }>;
}

export async function fetchReadinessThresholds(): Promise<ReadinessThreshold[]> {
  const { data, error } = await supabase.from('readiness_thresholds' as never).select('*');
  if (error) {
    console.warn('readiness_thresholds:', error.message);
    return [];
  }
  return (data ?? []) as unknown as ReadinessThreshold[];
}

export async function fetchTeacherClasses(teacherId: string): Promise<TeacherClass[]> {
  const { data, error } = await supabase
    .from('classes' as never)
    .select('id, name, grade_band, school_id')
    .eq('teacher_id', teacherId)
    .order('name');
  if (error) {
    console.warn('classes:', error.message);
    return [];
  }
  return (data ?? []) as unknown as TeacherClass[];
}

export async function fetchRoster(classId: string): Promise<RosterStudent[]> {
  const { data, error } = await supabase
    .from('class_students' as never)
    .select('student_id, display_name, class_id')
    .eq('class_id', classId);
  if (error) {
    console.warn('class_students:', error.message);
    return [];
  }
  return (data ?? []) as unknown as RosterStudent[];
}
