import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Database, BookOpen, Headphones, Pencil, Mic } from 'lucide-react';
import { ManualGradeEntry } from '@/components/admin/ManualGradeEntry';
import { CoverageHeatmap } from '@/components/admin/CoverageHeatmap';

interface PoolStats {
  total: number;
  bySection: Record<string, number>;
  byLevel: Record<string, number>;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="w-4 h-4" />,
  listening: <Headphones className="w-4 h-4" />,
  writing: <Pencil className="w-4 h-4" />,
  speaking: <Mic className="w-4 h-4" />
};

export default function Admin() {
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { count: total } = await supabase
        .from('item_bank')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      const { data: items } = await supabase
        .from('item_bank')
        .select('section_type, cefr_target')
        .eq('active', true);

      const bySection: Record<string, number> = {};
      const byLevel: Record<string, number> = {};

      items?.forEach(item => {
        bySection[item.section_type] = (bySection[item.section_type] || 0) + 1;
        byLevel[item.cefr_target] = (byLevel[item.cefr_target] || 0) + 1;
      });

      setPoolStats({ total: total || 0, bySection, byLevel });
    } catch (error: any) {
      toast.error(`Failed to load stats: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid gap-6 max-w-4xl">
        <ManualGradeEntry />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Item Bank Status
            </CardTitle>
            <CardDescription>English proficiency test item bank</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : poolStats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total items</div>
              </div>
              <Button onClick={loadStats} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {poolStats && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">By Section</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['reading', 'listening', 'writing', 'speaking'].map(section => (
                      <div key={section} className="bg-muted rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {SECTION_ICONS[section]}
                        </div>
                        <div className="text-xl font-bold">{poolStats.bySection[section] || 0}</div>
                        <div className="text-xs capitalize text-muted-foreground">{section}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">By CEFR Level</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                      <div key={level} className="bg-muted rounded-lg p-2 text-center">
                        <div className="text-lg font-bold">{poolStats.byLevel[level] || 0}</div>
                        <div className="text-xs text-muted-foreground">{level}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <CoverageHeatmap />
      </div>
    </div>
  );
}
