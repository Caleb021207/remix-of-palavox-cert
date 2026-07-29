import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Sparkles, Check, X, Pencil } from 'lucide-react';

type Skill = 'reading' | 'listening';
type Status = 'draft' | 'gated' | 'trial' | 'operational' | 'retired';

interface OptionRow {
  id: string;
  label: string;
  is_correct: boolean;
  position: number;
  rationale: string | null;
}

interface ItemRow {
  id: string;
  skill: string;
  format: string;
  stem: string;
  topic: string | null;
  target_wida_level: number;
  cefr_level: string | null;
  status: string;
  dok: number | null;
  gate_results: any;
  created_at: string;
  passage_id: string | null;
}

const LEVELS = [2, 3, 4, 5];
const TOPICS = [
  'school life', 'weather and climate', 'sports and teamwork', 'food and nutrition',
  'community helpers', 'animals and habitats', 'inventions and technology', 'music and art',
];

export default function Author() {
  const [skill, setSkill] = useState<Skill>('reading');
  const [level, setLevel] = useState('3');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [kluse, setKluse] = useState('Inform');
  const [count, setCount] = useState('3');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [options, setOptions] = useState<Record<string, OptionRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editStem, setEditStem] = useState('');

  const loadBank = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('items')
        .select('id, skill, format, stem, topic, target_wida_level, cefr_level, status, dok, gate_results, created_at, passage_id')
        .order('created_at', { ascending: false })
        .limit(300);
      if (filterSkill !== 'all') query = query.eq('skill', filterSkill);
      if (filterLevel !== 'all') query = query.eq('target_wida_level', Number(filterLevel));
      if (filterStatus !== 'all') query = query.eq('status', filterStatus as Status);

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as ItemRow[];
      setItems(rows);

      if (rows.length) {
        const { data: opts } = await supabase
          .from('item_options')
          .select('id, item_id, label, is_correct, position, rationale')
          .in('item_id', rows.map((r) => r.id));
        const grouped: Record<string, OptionRow[]> = {};
        (opts ?? []).forEach((o: any) => {
          (grouped[o.item_id] ||= []).push(o);
        });
        Object.values(grouped).forEach((list) => list.sort((a, b) => a.position - b.position));
        setOptions(grouped);
      } else {
        setOptions({});
      }
    } catch (e: any) {
      toast.error(`Could not load the bank: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [filterSkill, filterLevel, filterStatus]);

  useEffect(() => { loadBank(); }, [loadBank]);

  const generate = async () => {
    setRunning(true);
    setProgress('Running the authoring gauntlet — this can take a minute per item…');
    try {
      const { data, error } = await supabase.functions.invoke('generate-items', {
        body: {
          skill,
          target_wida_level: Number(level),
          topic,
          key_language_use: kluse,
          count: Number(count),
        },
      });
      if (error) throw error;
      setProgress(`Generated ${data.generated}, passed all gates: ${data.passed}.`);
      toast.success(`Generated ${data.generated} · gated ${data.passed}`);
      await loadBank();
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
      setProgress(null);
    } finally {
      setRunning(false);
    }
  };

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.functions.invoke('review-item', {
      body: { item_id: id, status },
    });
    if (error) return toast.error(error.message);
    toast.success(`Item marked ${status}`);
    loadBank();
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.functions.invoke('review-item', {
      body: { item_id: id, stem: editStem },
    });
    if (error) return toast.error(error.message);
    setEditing(null);
    toast.success('Item updated');
    loadBank();
  };

  const funnel = useMemo(() => {
    const map: Record<string, { generated: number; gated: number; operational: number }> = {};
    items.forEach((i) => {
      const key = `${i.skill} · WIDA ${i.target_wida_level}`;
      const row = (map[key] ||= { generated: 0, gated: 0, operational: 0 });
      row.generated += 1;
      if (['gated', 'trial', 'operational'].includes(i.status)) row.gated += 1;
      if (i.status === 'operational') row.operational += 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Item Authoring &amp; Review</h1>
        <p className="text-muted-foreground">
          English reading &amp; listening practice items for grades 6–8, aligned to WIDA 1–6 and CEFR.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Generator</CardTitle>
          <CardDescription>Every draft runs the level, solver, distractor, duplicate, key-balance and bias gates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-1">
              <Label>Skill</Label>
              <Select value={skill} onValueChange={(v) => setSkill(v as Skill)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="listening">Listening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>WIDA level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Key language use</Label>
              <Select value={kluse} onValueChange={setKluse}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Narrate', 'Inform', 'Explain', 'Argue'].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Count</Label>
              <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={generate} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate items
            </Button>
            {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
          <CardDescription>Generated vs gated vs operational, per skill and level (current filter).</CardDescription>
        </CardHeader>
        <CardContent>
          {funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {funnel.map(([key, v]) => (
                <div key={key} className="rounded-lg border p-3">
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-sm text-muted-foreground">
                    generated {v.generated} · gated {v.gated} · operational {v.operational}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bank browser</CardTitle>
            <CardDescription>Answer keys and rationales are visible to administrators only.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadBank}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={filterSkill} onValueChange={setFilterSkill}>
              <SelectTrigger><SelectValue placeholder="Skill" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All skills</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="listening">Listening</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((l) => <SelectItem key={l} value={String(l)}>WIDA {l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['draft', 'gated', 'trial', 'operational', 'retired'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items match these filters.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{item.skill}</Badge>
                    <Badge variant="outline">WIDA {item.target_wida_level}</Badge>
                    {item.cefr_level && <Badge variant="outline">{item.cefr_level}</Badge>}
                    {item.dok && <Badge variant="outline">DOK {item.dok}</Badge>}
                    <Badge className="capitalize">{item.status}</Badge>
                    {item.topic && <span className="text-xs text-muted-foreground">{item.topic}</span>}
                  </div>

                  {editing === item.id ? (
                    <div className="space-y-2">
                      <Textarea value={editStem} onChange={(e) => setEditStem(e.target.value)} rows={3} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(item.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-medium">{item.stem}</p>
                  )}

                  <ul className="space-y-1 text-sm">
                    {(options[item.id] ?? []).map((o) => (
                      <li key={o.id} className={o.is_correct ? 'text-primary font-medium' : ''}>
                        {o.position}. {o.label}
                        {o.is_correct && ' ✓ key'}
                        {o.rationale && <span className="block text-xs text-muted-foreground">{o.rationale}</span>}
                      </li>
                    ))}
                  </ul>

                  {item.gate_results && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.gate_results as Record<string, any>).map(([gate, r]) => (
                        <Badge key={gate} variant={r?.pass ? 'secondary' : 'destructive'} title={r?.reason}>
                          {gate}: {r?.pass ? 'pass' : 'fail'}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStatus(item.id, 'operational')}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(item.id, 'retired')}>
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(item.id); setEditStem(item.stem); }}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
