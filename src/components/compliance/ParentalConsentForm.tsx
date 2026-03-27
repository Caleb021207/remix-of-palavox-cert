import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParentalConsentFormProps {
  studentId: string;
  schoolId: string;
  onConsent: () => void;
}

export const ParentalConsentForm = ({ studentId, schoolId, onConsent }: ParentalConsentFormProps) => {
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      toast.error("You must provide consent to continue");
      return;
    }

    setIsLoading(true);
    try {
      await supabase.from('consent_records').insert({
        user_id: studentId,
        consent_type: 'parental_consent',
        granted: consentGiven,
        guardian_email: parentEmail,
        ip_address: null,
      });

      await supabase.from('event_logs').insert({
        user_id: studentId,
        event_type: 'parental_consent_given',
        payload: {
          parent_email: parentEmail,
          parent_name: parentName,
          school_id: schoolId,
        },
      });

      toast.success("Parental consent recorded successfully");
      onConsent();
    } catch (error) {
      console.error('Parental consent error:', error);
      toast.error("Failed to record parental consent. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Parental Consent Required</CardTitle>
        <CardDescription>
          Parental consent is required under FERPA before we can collect and process student data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-semibold">What Data We Collect:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Test responses (written and spoken answers)</li>
              <li>Audio recordings of speaking assessments</li>
              <li>Test scores and proficiency levels</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Full Name</Label>
              <Input id="parentName" type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} required placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
              <Input id="parentEmail" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required placeholder="parent@example.com" />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="consent" checked={consentGiven} onCheckedChange={(checked) => setConsentGiven(checked as boolean)} />
              <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                I consent to Palavox collecting and processing my child's educational data as described above.
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !consentGiven}>
            {isLoading ? "Submitting..." : "Provide Parental Consent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
