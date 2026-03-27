import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, Eye, Shield } from "lucide-react";

interface UserData {
  test_sessions?: any[];
  consent_records?: any[];
}

const StudentDataPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: sessions } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: consents } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', user.id);

      setUserData({
        test_sessions: sessions || [],
        consent_records: consents || [],
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
            View and export your educational data in compliance with FERPA
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
          </TabsList>

          <TabsContent value="view" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
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
                            <Label>Status</Label>
                            <p className="text-muted-foreground">{session.status}</p>
                          </div>
                          <div>
                            <Label>Date</Label>
                            <p className="text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString()}
                            </p>
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
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Your Data</CardTitle>
                <CardDescription>
                  Download all your educational data in portable JSON format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data (JSON)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDataPortal;
