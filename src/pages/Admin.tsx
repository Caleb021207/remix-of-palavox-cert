import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Zap, Database, BookOpen, Headphones, Pencil, Mic, Clock, CheckCircle2 } from 'lucide-react';
import { ManualGradeEntry } from '@/components/admin/ManualGradeEntry';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CoverageHeatmap } from '@/components/admin/CoverageHeatmap';
interface PoolStats {
  total: number;
  bySection: Record<string, number>;
  byLevel: Record<string, number>;
  byLanguage: Record<string, number>;
}

interface PrewarmJob {
  id: string;
  status: string;
  progress: any;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="w-4 h-4" />,
  listening: <Headphones className="w-4 h-4" />,
  writing: <Pencil className="w-4 h-4" />,
  speaking: <Mic className="w-4 h-4" />
};

export default function Admin() {
  const [isPrewarming, setIsPrewarming] = useState(false);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<PrewarmJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState<string[]>(['reading', 'listening', 'writing', 'speaking']);
  const [batchSize, setBatchSize] = useState(30);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get total count
      const { count: total } = await supabase
        .from('cert_content_pool')
        .select('*', { count: 'exact', head: true })
        .eq('version', 'v1-gpt4o-mini');

      // Get breakdown by section
      const { data: sectionData } = await supabase
        .from('cert_content_pool')
        .select('section')
        .eq('version', 'v1-gpt4o-mini');

      // Get breakdown by level
      const { data: levelData } = await supabase
        .from('cert_content_pool')
        .select('level')
        .eq('version', 'v1-gpt4o-mini');

      // Get breakdown by language
      const { data: langData } = await supabase
        .from('cert_content_pool')
        .select('language')
        .eq('version', 'v1-gpt4o-mini');

      const bySection: Record<string, number> = {};
      const byLevel: Record<string, number> = {};
      const byLanguage: Record<string, number> = {};

      sectionData?.forEach(item => {
        bySection[item.section] = (bySection[item.section] || 0) + 1;
      });

      levelData?.forEach(item => {
        byLevel[item.level] = (byLevel[item.level] || 0) + 1;
      });

      langData?.forEach(item => {
        byLanguage[item.language] = (byLanguage[item.language] || 0) + 1;
      });

      setPoolStats({
        total: total || 0,
        bySection,
        byLevel,
        byLanguage
      });

      // Get recent jobs
      const { data: jobs } = await supabase
        .from('prewarm_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentJobs(jobs || []);

    } catch (error: any) {
      toast.error(`Failed to load stats: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Poll for updates every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const startPrewarm = async (sections?: string[]) => {
    setIsPrewarming(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-prewarm', {
        body: { 
          targetItems: 60,
          batchSize,
          prioritySections: sections || selectedSections.length < 4 ? selectedSections : undefined
        }
      });

      if (error) throw error;

      toast.success(`Prewarm job started: ${data.jobId?.slice(0, 8)}...`, {
        description: `Generating ${batchSize} items for ${sections?.join(', ') || 'all sections'}`
      });
      
      // Refresh stats
      setTimeout(loadStats, 2000);
      
    } catch (error: any) {
      toast.error(`Failed to start prewarm: ${error.message}`);
    } finally {
      setIsPrewarming(false);
    }
  };

  const toggleSection = (section: string) => {
    setSelectedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const runningJobs = recentJobs.filter(j => j.status === 'running');

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid gap-6 max-w-4xl">
        <ManualGradeEntry />

        {/* Content Pool Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Content Pool Status
            </CardTitle>
            <CardDescription>
              Pre-generated ESL test content for all languages and levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : poolStats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total items in pool</div>
              </div>
              <Button onClick={loadStats} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {poolStats && (
              <>
                {/* By Section */}
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

                {/* By Level */}
                <div>
                  <h4 className="text-sm font-medium mb-2">By Level</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                      <div key={level} className="bg-muted rounded-lg p-2 text-center">
                        <div className="text-lg font-bold">{poolStats.byLevel[level] || 0}</div>
                        <div className="text-xs text-muted-foreground">{level}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Languages */}
                <div>
                  <h4 className="text-sm font-medium mb-2">By Language</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(poolStats.byLanguage)
                      .sort(([,a], [,b]) => b - a)
                      .map(([lang, count]) => (
                        <div key={lang} className="bg-muted rounded-lg p-2 text-center">
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground capitalize truncate">{lang}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Coverage Heatmap */}
        <CoverageHeatmap />

        {/* Prewarm Controls */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Generate Content (Prewarm)
            </CardTitle>
            <CardDescription>
              Generate bilingual content for ESL assessments. Each batch generates content items prioritizing sections with the least coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Section Selection */}
            <div>
              <Label className="text-sm font-medium">Focus Sections (optional)</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {['reading', 'listening', 'writing', 'speaking'].map(section => (
                  <div key={section} className="flex items-center space-x-2">
                    <Checkbox 
                      id={section}
                      checked={selectedSections.includes(section)}
                      onCheckedChange={() => toggleSection(section)}
                    />
                    <Label htmlFor={section} className="flex items-center gap-1 capitalize cursor-pointer">
                      {SECTION_ICONS[section]}
                      {section}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Select specific sections or leave all checked for balanced generation
              </p>
            </div>

            {/* Batch Size Selection */}
            <div>
              <Label className="text-sm font-medium">Batch Size</Label>
              <div className="flex gap-2 mt-2">
                {[20, 30, 50].map(size => (
                  <Button
                    key={size}
                    variant={batchSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBatchSize(size)}
                  >
                    {size} items
                  </Button>
                ))}
              </div>
            </div>

            {/* Main Start Button */}
            <Button 
              onClick={() => startPrewarm()} 
              disabled={isPrewarming || selectedSections.length === 0}
              size="lg"
              className="w-full"
            >
              {isPrewarming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Start Prewarm Batch ({batchSize} items)
                </>
              )}
            </Button>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => startPrewarm(['listening'])}
                disabled={isPrewarming}
              >
                <Headphones className="mr-1 h-3 w-3" />
                Listening Only
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => startPrewarm(['writing', 'speaking'])}
                disabled={isPrewarming}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Writing + Speaking
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <div><strong>Target:</strong> 60 items per section/level/language</div>
              <div><strong>Languages:</strong> 18 major languages</div>
              <div><strong>Cost:</strong> ~$0.002 per item (GPT-4o-mini)</div>
            </div>
          </CardContent>
        </Card>

        {/* Running Jobs Alert */}
        {runningJobs.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                {runningJobs.length} Job{runningJobs.length > 1 ? 's' : ''} Running
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runningJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between">
                  <span className="text-sm">
                    {(job.progress as any)?.lastProcessed || 'Starting...'}
                  </span>
                  <span className="text-sm font-medium">
                    +{(job.progress as any)?.totalGenerated || 0} generated
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Prewarm Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No jobs yet</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          job.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                          job.status === 'completed' ? 'bg-green-500' :
                          job.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium capitalize">{job.status}</span>
                        {job.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {job.progress && (
                        <>
                          <div className="font-medium text-primary">
                            +{(job.progress as any).totalGenerated || 0} generated
                          </div>
                          {(job.progress as any).sectionStats && (
                            <div className="text-xs text-muted-foreground">
                              {Object.entries((job.progress as any).sectionStats || {}).map(([s, c]) => 
                                `${s}: ${c}`
                              ).join(', ')}
                            </div>
                          )}
                          {job.status === 'running' && (
                            <div className="text-xs text-muted-foreground">
                              {(job.progress as any).lastProcessed || 'Starting...'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cron Job Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Cron Job Setup</CardTitle>
            <CardDescription>
              To automatically maintain the content pool, set up a daily cron job in Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">Steps to enable:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to Supabase Dashboard → Database → Extensions</li>
                <li>Enable <code className="bg-background px-1 rounded">pg_cron</code></li>
                <li>Enable <code className="bg-background px-1 rounded">pg_net</code></li>
                <li>Run the SQL in the SQL Editor to create the cron job</li>
              </ol>
            </div>
            <div className="text-xs text-muted-foreground">
              The cron job will run daily at 3:00 AM UTC and generate ~50 items to maintain the pool.
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Content Pool Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Sections (4):</strong> Reading, Listening, Writing, Speaking
            </div>
            <div>
              <strong>CEFR Levels (6):</strong> A1, A2, B1, B2, C1, C2
            </div>
            <div>
              <strong>Languages (18):</strong> Spanish, French, German, Italian, Portuguese, Russian, Ukrainian, Chinese, Japanese, Korean, Hindi, Vietnamese, Indonesian, Arabic, Persian, Urdu, Pashto, Swahili
            </div>
            <div>
              <strong>Content Structure:</strong>
              <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                <li>Reading: English passage + questions in native language</li>
                <li>Listening: English passage + audio + native questions</li>
                <li>Writing: Bilingual prompts (English + native)</li>
                <li>Speaking: Bilingual prompts with follow-up questions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
