import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Copy, Download, Users, FileText, BarChart } from 'lucide-react';

interface School {
  id: string;
  name: string;
  district?: string;
  contact_email: string;
  contact_name?: string;
  agreement_signed_date?: string;
  is_active: boolean;
}

interface CertificationCode {
  id: string;
  code: string;
  student_id: string;
  student_name?: string;
  generated_at: string;
  expires_at?: string;
  max_uses: number;
}

interface StudentSession {
  id: string;
  student_id: string;
  student_name?: string;
  test_type: string;
  cefr_level?: string;
  actfl_level?: string;
  score?: number;
  end_time?: string;
}

export default function SchoolDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [codes, setCodes] = useState<CertificationCode[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Check user role and get school
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, school_id')
        .eq('user_id', user?.id)
        .eq('role', 'school_admin')
        .single();

      if (!roleData?.school_id) {
        toast.error('You do not have school admin access');
        navigate('/');
        return;
      }

      // Load school info
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', roleData.school_id)
        .single();

      setSchool(schoolData);

      // Load certification codes
      const { data: codesData } = await supabase
        .from('certification_codes')
        .select('*')
        .eq('school_id', roleData.school_id)
        .order('generated_at', { ascending: false });

      setCodes(codesData || []);

      // Load student test sessions
      const { data: usageData } = await supabase
        .from('code_usage_log')
        .select('test_session_id, student_id')
        .eq('school_id', roleData.school_id);

      if (usageData && usageData.length > 0) {
        const sessionIds = usageData.map(u => u.test_session_id).filter(Boolean);
        
        const { data: sessionsData } = await supabase
          .from('test_sessions')
          .select('id, test_type, cefr_level, actfl_level, score, end_time')
          .in('id', sessionIds);

        // Combine with student info from usage log
        const enrichedSessions = sessionsData?.map(session => {
          const usage = usageData.find(u => u.test_session_id === session.id);
          const code = codesData?.find(c => c.student_id === usage?.student_id);
          return {
            ...session,
            student_id: usage?.student_id || 'Unknown',
            student_name: code?.student_name,
          };
        }) || [];

        setSessions(enrichedSessions);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!studentId.trim()) {
      toast.error('Student ID is required');
      return;
    }

    if (!school?.id) {
      toast.error('School information not loaded');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-certification-code', {
        body: {
          schoolId: school.id,
          studentId: studentId.trim(),
          studentName: studentName.trim() || null,
          notes: notes.trim() || null,
          maxUses: 3,
        },
      });

      if (error) throw error;

      toast.success('Certification code generated successfully!');
      
      // Copy code to clipboard
      if (data.code) {
        await navigator.clipboard.writeText(data.code);
        toast.info('Code copied to clipboard');
      }

      // Reset form
      setStudentId('');
      setStudentName('');
      setNotes('');

      // Reload codes
      loadDashboardData();

    } catch (error) {
      console.error('Error generating code:', error);
      toast.error('Failed to generate certification code');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const exportData = () => {
    const csv = [
      ['Student ID', 'Student Name', 'Test Type', 'CEFR Level', 'ACTFL Level', 'Score', 'Completed'],
      ...sessions.map(s => [
        s.student_id,
        s.student_name || '',
        s.test_type,
        s.cefr_level || '',
        s.actfl_level || '',
        s.score?.toString() || '',
        s.end_time ? new Date(s.end_time).toLocaleString() : 'In Progress',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${school?.id}-student-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{school?.name}</h1>
          <p className="text-muted-foreground">
            {school?.district && `${school.district} • `}
            School ID: {school?.id}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{codes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students Tested</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(sessions.map(s => s.student_id)).size}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => s.end_time).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Code */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Certification Code</CardTitle>
            <CardDescription>Create a new certification code for a student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g., STU-2024-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="studentName">Student Name (Optional)</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Grade 10, Spanish 2"
                  rows={2}
                />
              </div>
              <Button onClick={handleGenerateCode} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Code'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Certification Codes Table */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Certification Codes</CardTitle>
              <CardDescription>All generated codes for your school</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Max Uses</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono text-sm">{code.student_id}</TableCell>
                    <TableCell>{code.student_name || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{code.code}</TableCell>
                    <TableCell>{new Date(code.generated_at).toLocaleDateString()}</TableCell>
                    <TableCell>{code.max_uses}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Student Test Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student Test Results</CardTitle>
              <CardDescription>View all test sessions from your students</CardDescription>
            </div>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Test Type</TableHead>
                  <TableHead>CEFR Level</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-sm">{session.student_id}</TableCell>
                    <TableCell>{session.student_name || '-'}</TableCell>
                    <TableCell className="capitalize">{session.test_type}</TableCell>
                    <TableCell>{session.cefr_level || '-'}</TableCell>
                    <TableCell>{session.score ? `${Math.round(session.score)}%` : '-'}</TableCell>
                    <TableCell>
                      {session.end_time 
                        ? new Date(session.end_time).toLocaleString()
                        : 'In Progress'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
