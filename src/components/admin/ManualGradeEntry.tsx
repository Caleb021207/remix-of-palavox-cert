import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { determineCEFRLevel, determineACTFLLevel } from '@/utils/scoring';
import { generateScoreReport } from '@/utils/scoreReportGenerator';
import { TestSession, TestType, CEFRLevel, ACTFLLevel } from '@/types';
import { languages } from '@/config/languages';

export function ManualGradeEntry() {
  const [studentName, setStudentName] = useState('');
  const [testDate, setTestDate] = useState<Date>();
  const [language, setLanguage] = useState('');
  const [comprehensionScore, setComprehensionScore] = useState<number>(0);
  const [writingScore, setWritingScore] = useState<number>(0);
  const [conversationScore, setConversationScore] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const overallScore = Math.round((comprehensionScore + writingScore + conversationScore) / 3);
  const cefr = determineCEFRLevel(overallScore);
  const actfl = determineACTFLLevel(overallScore);

  const getCEFRColor = (level: CEFRLevel): string => {
    const colors: Record<CEFRLevel, string> = {
      [CEFRLevel.PreA1]: 'text-gray-600',
      [CEFRLevel.A1]: 'text-red-600',
      [CEFRLevel.A1Plus]: 'text-red-500',
      [CEFRLevel.A2]: 'text-orange-600',
      [CEFRLevel.A2Plus]: 'text-orange-500',
      [CEFRLevel.B1]: 'text-yellow-600',
      [CEFRLevel.B1Plus]: 'text-yellow-500',
      [CEFRLevel.B2]: 'text-green-600',
      [CEFRLevel.C1]: 'text-blue-600',
      [CEFRLevel.C1Plus]: 'text-blue-500',
      [CEFRLevel.C2]: 'text-purple-600',
    };
    return colors[level] || 'text-gray-600';
  };

  const handleGenerateReport = async () => {
    if (!studentName.trim()) {
      toast.error('Please enter student name');
      return;
    }
    if (!testDate) {
      toast.error('Please select test date');
      return;
    }
    if (!language) {
      toast.error('Please select a language');
      return;
    }

    setIsGenerating(true);

    try {
      const mockSession: TestSession = {
        id: studentName, // Use student name as ID for report
        testType: TestType.Certification,
        score: overallScore,
        cefr,
        actfl,
        phaseScores: {
          comprehension: comprehensionScore,
          writing: writingScore,
          conversation: conversationScore,
        },
        startTime: testDate,
        endTime: testDate,
        language: language as any,
        answers: {},
      };

      const blob = await generateScoreReport(mockSession);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `score-report-${studentName.replace(/\s+/g, '-')}-${format(testDate, 'yyyy-MM-dd')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Score report generated successfully!');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormValid = studentName.trim() && testDate && language && 
    comprehensionScore >= 0 && writingScore >= 0 && conversationScore >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Grade Entry & Score Receipt</CardTitle>
        <CardDescription>
          Enter student information and test scores to generate an official score report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Name *</Label>
            <Input
              id="studentName"
              placeholder="Enter student name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Test Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !testDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {testDate ? format(testDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={testDate}
                  onSelect={setTestDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language Tested *</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languages).map(([code, lang]) => (
                  <SelectItem key={code} value={code}>
                    {lang.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="comprehension">Comprehension Score</Label>
            <Input
              id="comprehension"
              type="number"
              min="0"
              max="100"
              value={comprehensionScore}
              onChange={(e) => setComprehensionScore(Math.min(100, Math.max(0, Number(e.target.value))))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="writing">Written Production Score</Label>
            <Input
              id="writing"
              type="number"
              min="0"
              max="100"
              value={writingScore}
              onChange={(e) => setWritingScore(Math.min(100, Math.max(0, Number(e.target.value))))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversation">Conversational Fluency Score</Label>
            <Input
              id="conversation"
              type="number"
              min="0"
              max="100"
              value={conversationScore}
              onChange={(e) => setConversationScore(Math.min(100, Math.max(0, Number(e.target.value))))}
            />
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-3">Calculated Results</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{overallScore}%</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{actfl}</div>
              <div className="text-sm text-muted-foreground">ACTFL Level</div>
            </div>
            <div>
              <div className={cn("text-2xl font-bold", getCEFRColor(cefr))}>{cefr}</div>
              <div className="text-sm text-muted-foreground">CEFR Equivalent</div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={!isFormValid || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Score Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
