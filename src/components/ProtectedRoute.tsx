
import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, UserPlus, ShieldAlert } from 'lucide-react';
import { AuthModal } from './auth/AuthModal';
import { useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When set, the signed-in user must hold this role (checked server-side via has_role). */
  requireRole?: 'admin' | 'moderator' | 'school_admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [roleState, setRoleState] = useState<'idle' | 'checking' | 'allowed' | 'denied'>(
    requireRole ? 'checking' : 'allowed'
  );

  useEffect(() => {
    if (!requireRole) {
      setRoleState('allowed');
      return;
    }
    if (!user) {
      setRoleState('checking');
      return;
    }
    let cancelled = false;
    setRoleState('checking');
    // Authoritative check: the security-definer has_role() function on the server.
    supabase
      .rpc('has_role', { _user_id: user.id, _role: requireRole })
      .then(({ data, error }) => {
        if (cancelled) return;
        setRoleState(!error && data === true ? 'allowed' : 'denied');
      });
    return () => {
      cancelled = true;
    };
  }, [user, requireRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-palavox-purple"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-palavox-ivory px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-palavox-lavender flex items-center justify-center">
                <Lock className="h-8 w-8 text-palavox-purple" />
              </div>
              <CardTitle className="text-2xl">Authentication Required</CardTitle>
              <p className="text-palavox-slate">
                You need to sign in to access the language certification test.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-palavox-purple hover:bg-palavox-purple/90 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Sign In / Create Account
              </Button>
              <p className="text-xs text-center text-palavox-slate">
                Create your free account to take professional language assessments
              </p>
            </CardContent>
          </Card>
        </div>

        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  if (requireRole && roleState === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-palavox-purple"></div>
      </div>
    );
  }

  if (requireRole && roleState === 'denied') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-palavox-ivory px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-palavox-lavender flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-palavox-purple" />
            </div>
            <CardTitle className="text-2xl">Not authorised</CardTitle>
            <p className="text-palavox-slate">
              This area is restricted to administrators.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/">Return to home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
