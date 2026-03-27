import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Download, Users, FileText, BarChart } from 'lucide-react';

export default function SchoolDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Check if user belongs to an organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user?.id)
        .single();

      if (!membership) {
        toast.error('You do not have organization access');
        navigate('/');
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', membership.organization_id)
        .single();

      if (org) {
        setOrgName(org.name);
        setOrgId(org.id);
      }

      // Load voucher codes for this org
      const { data: voucherData } = await supabase
        .from('voucher_codes')
        .select('*')
        .eq('organization_id', membership.organization_id);

      setVouchers(voucherData || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-4xl font-bold mb-2">{orgName || 'School Dashboard'}</h1>
          <p className="text-muted-foreground">Organization ID: {orgId}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voucher Codes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vouchers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vouchers.reduce((sum, v) => sum + (v.uses_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vouchers.filter(v => v.active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Voucher Codes</CardTitle>
            <CardDescription>Manage voucher codes for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {vouchers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No voucher codes yet. Contact an admin to generate codes.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Max Uses</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-sm">{v.code}</TableCell>
                      <TableCell>{v.uses_count}</TableCell>
                      <TableCell>{v.max_uses || '∞'}</TableCell>
                      <TableCell>{v.active ? '✓' : '✗'}</TableCell>
                      <TableCell>{v.expires_at ? new Date(v.expires_at).toLocaleDateString() : 'Never'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
