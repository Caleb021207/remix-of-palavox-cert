import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, Trash2, Eye, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserData {
  test_sessions?: any[];
  user_answers?: any[];
  parental_consents?: any[];
  user_age?: any;
}

const StudentDataPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [requestType, setRequestType] = useState<'view' | 'export' | 'delete'>('view');
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterRelationship, setRequesterRelationship] = useState<'student' | 'parent' | 'guardian' | 'school_official'>('student');
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load test sessions
      const { data: sessions } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load user answers
      const { data: answers } = await supabase
        .from('user_answers')
        .select('*, test_sessions!inner(user_id)')
        .eq('test_sessions.user_id', user.id);

      // Load parental consents
      const { data: consents } = await supabase
        .from('parental_consents')
        .select('*')
        .or(`student_id.eq.${user.id},parent_email.eq.${user.email}`);

      // Load age data
      const { data: ageData } = await supabase
        .from('user_ages')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserData({
        test_sessions: sessions || [],
        user_answers: answers || [],
        parental_consents: consents || [],
        user_age: ageData
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `palavox-student-data-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleDataRequest = async () => {
    if (!user) return;

    if (!requesterEmail) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      const { error } = await supabase
        .from('data_access_requests')
        .insert({
          user_id: user.id,
          request_type: requestType,
          status: 'pending',
          requester_email: requesterEmail,
          requester_relationship: requesterRelationship,
          notes: notes || null
        });

      if (error) throw error;

      toast.success(`${requestType.charAt(0).toUpperCase() + requestType.slice(1)} request submitted successfully. We will process it within 45 days.`);
      setNotes("");
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error("Failed to submit request");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to access your data</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Student Data Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            View, export, and manage your educational data in compliance with FERPA
          </p>
        </div>

        <Tabs defaultValue="view" className="space-y-4">
          <TabsList>
            <TabsTrigger value="view">
              <Eye className="h-4 w-4 mr-2" />
              View My Data
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Trash2 className="h-4 w-4 mr-2" />
              Data Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your account and age verification data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {userData.user_age && (
                  <>
                    <div>
                      <Label>Date of Birth</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(userData.user_age.date_of_birth).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label>Minor Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {userData.user_age.is_minor ? 'Under 18 (Parental consent required)' : 'Adult (18 or older)'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Sessions</CardTitle>
                <CardDescription>
                  {userData.test_sessions?.length || 0} test session(s) recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userData.test_sessions && userData.test_sessions.length > 0 ? (
                  <div className="space-y-3">
                    {userData.test_sessions.map((session: any) => (
                      <div key={session.id} className="p-4 border rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <Label>Test Type</Label>
                            <p className="text-muted-foreground">{session.test_type}</p>
                          </div>
                          <div>
                            <Label>Score</Label>
                            <p className="text-muted-foreground">{session.score || 'Pending'}%</p>
                          </div>
                          <div>
                            <Label>Date</Label>
                            <p className="text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <Label>Language</Label>
                            <p className="text-muted-foreground">{session.language || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No test sessions found</p>
                )}
              </CardContent>
            </Card>

            {userData.parental_consents && userData.parental_consents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Parental Consent Records</CardTitle>
                  <CardDescription>Active consent for data collection</CardDescription>
                </CardHeader>
                <CardContent>
                  {userData.parental_consents.map((consent: any) => (
                    <div key={consent.id} className="p-4 border rounded-lg space-y-2">
                      <div>
                        <Label>Parent Name</Label>
                        <p className="text-sm text-muted-foreground">{consent.parent_name}</p>
                      </div>
                      <div>
                        <Label>Parent Email</Label>
                        <p className="text-sm text-muted-foreground">{consent.parent_email}</p>
                      </div>
                      <div>
                        <Label>Consent Date</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(consent.consent_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <p className="text-sm text-muted-foreground">
                          {consent.consent_given ? 'Active' : 'Revoked'}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Your Data</CardTitle>
                <CardDescription>
                  Download all your educational data in portable JSON format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Data Included in Export:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Personal information (email, age verification)</li>
                    <li>Test sessions and scores</li>
                    <li>Test responses and answers</li>
                    <li>Parental consent records</li>
                  </ul>
                </div>
                <Button onClick={handleExportData} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data (JSON)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Data Access & Deletion Requests</CardTitle>
                <CardDescription>
                  Submit a formal request to view, export, or delete your educational records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Select value={requestType} onValueChange={(value: any) => setRequestType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View All Data</SelectItem>
                        <SelectItem value="export">Export Data</SelectItem>
                        <SelectItem value="delete">Delete All Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Your Email</Label>
                    <Input
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder={user.email || "your.email@example.com"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Your Relationship to Student</Label>
                    <Select value={requesterRelationship} onValueChange={(value: any) => setRequesterRelationship(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student (Self)</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Legal Guardian</SelectItem>
                        <SelectItem value="school_official">School Official</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Provide any additional context for your request..."
                      rows={4}
                    />
                  </div>
                </div>

                {requestType === 'delete' && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <p className="text-sm font-semibold text-destructive">
                      ⚠️ Warning: Data deletion is permanent
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deleting your data will remove all test results, scores, and certificates. This action cannot be undone.
                    </p>
                  </div>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full">
                      Submit {requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Data Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are requesting to <strong>{requestType}</strong> your educational data. 
                        This request will be processed within 45 days as required by FERPA.
                        {requestType === 'delete' && (
                          <span className="block mt-2 text-destructive font-semibold">
                            This will permanently delete all your data and cannot be undone.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDataRequest}>
                        Confirm Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Processing Time:</strong> Up to 45 days per FERPA regulations</p>
                  <p><strong>Questions:</strong> Contact dataaccess@palavox.org</p>
                  <p><strong>Rights:</strong> See our Privacy Policy for details on your FERPA rights</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDataPortal;
