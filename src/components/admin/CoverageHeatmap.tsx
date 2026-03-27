import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Grid3X3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CoverageData {
  section: string;
  level: string;
  count: number;
}

const SECTIONS = ['reading', 'listening', 'speaking', 'writing'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function getCellColor(count: number): string {
  if (count === 0) return 'bg-destructive/20 text-destructive';
  if (count === 1) return 'bg-yellow-500/30 text-yellow-700 dark:text-yellow-400';
  if (count <= 3) return 'bg-green-500/30 text-green-700 dark:text-green-400';
  return 'bg-green-500/50 text-green-800 dark:text-green-300 font-bold';
}

export function CoverageHeatmap() {
  const [data, setData] = useState<CoverageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('reading');

  const loadCoverage = async () => {
    setLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('item_bank')
        .select('section_type, cefr_target')
        .eq('active', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      items?.forEach(item => {
        const key = `${item.section_type}-${item.cefr_target}`;
        counts[key] = (counts[key] || 0) + 1;
      });

      const result: CoverageData[] = [];
      SECTIONS.forEach(section => {
        LEVELS.forEach(level => {
          const key = `${section}-${level}`;
          result.push({ section, level, count: counts[key] || 0 });
        });
      });

      setData(result);
    } catch (error) {
      console.error('Failed to load coverage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverage();
    const interval = setInterval(loadCoverage, 15000);
    return () => clearInterval(interval);
  }, []);

  const getSectionData = (section: string) => data.filter(d => d.section === section);

  const getSectionStats = (section: string) => {
    const sectionData = getSectionData(section);
    const total = sectionData.reduce((sum, d) => sum + d.count, 0);
    const covered = sectionData.filter(d => d.count > 0).length;
    const totalCombos = LEVELS.length;
    return { total, covered, totalCombos, percent: Math.round((covered / totalCombos) * 100) };
  };

  if (loading && data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5" />
          Item Bank Coverage
        </CardTitle>
        <CardDescription>
          Items by section and CEFR level.
          <span className="inline-block w-3 h-3 bg-destructive/20 rounded mx-1" /> 0
          <span className="inline-block w-3 h-3 bg-yellow-500/30 rounded mx-1" /> 1
          <span className="inline-block w-3 h-3 bg-green-500/30 rounded mx-1" /> 2-3
          <span className="inline-block w-3 h-3 bg-green-500/50 rounded mx-1" /> 4+
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="grid w-full grid-cols-4">
            {SECTIONS.map(section => {
              const stats = getSectionStats(section);
              return (
                <TabsTrigger key={section} value={section} className="flex flex-col py-2">
                  <span className="capitalize">{section}</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.total} items
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECTIONS.map(section => (
            <TabsContent key={section} value={section} className="mt-4">
              <div className="grid grid-cols-6 gap-2">
                {LEVELS.map(level => {
                  const item = data.find(d => d.section === section && d.level === level);
                  const count = item?.count || 0;
                  return (
                    <div key={level} className={`p-3 rounded text-center ${getCellColor(count)}`}>
                      <div className="font-medium">{level}</div>
                      <div className="text-lg font-bold">{count}</div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
