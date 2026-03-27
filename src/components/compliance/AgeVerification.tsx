import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AgeVerificationProps {
  onVerified: (isMinor: boolean, dateOfBirth: string) => void;
}

export const AgeVerification = ({ onVerified }: AgeVerificationProps) => {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }

    const age = calculateAge(dateOfBirth);
    
    if (age < 13) {
      toast.error("You must be at least 13 years old to use this service");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Store age verification data
        const { error } = await supabase
          .from('user_ages')
          .upsert({
            user_id: user.id,
            date_of_birth: dateOfBirth,
            is_minor: age < 18,
            verified_at: new Date().toISOString()
          });

        if (error) throw error;

        // Log the verification
        await supabase.rpc('log_security_event', {
          p_action: 'age_verification',
          p_resource_type: 'user_age',
          p_resource_id: user.id,
          p_details: { age, is_minor: age < 18 }
        });
      }

      onVerified(age < 18, dateOfBirth);
      
      if (age < 18) {
        toast.info("Parental consent is required for users under 18");
      } else {
        toast.success("Age verified successfully");
      }
    } catch (error) {
      console.error('Age verification error:', error);
      toast.error("Failed to verify age. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Age Verification Required</CardTitle>
        <CardDescription>
          We need to verify your age to comply with privacy regulations (FERPA).
          Your date of birth will be securely stored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="text-xs text-muted-foreground">
              Users under 18 require parental consent to use this service
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify Age"}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>By proceeding, you acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You have read our Privacy Policy</li>
              <li>Your data will be handled in accordance with FERPA</li>
              <li>If under 18, parental consent is required</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
