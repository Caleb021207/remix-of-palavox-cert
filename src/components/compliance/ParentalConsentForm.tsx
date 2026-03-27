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

const CONSENT_VERSION = "1.0";

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
      // Get client IP (in production, this would come from server)
      const clientIp = null; // Will be captured server-side in production

      const { error } = await supabase
        .from('parental_consents')
        .insert({
          student_id: studentId,
          school_id: schoolId,
          parent_email: parentEmail,
          parent_name: parentName,
          consent_given: consentGiven,
          consent_date: new Date().toISOString(),
          consent_ip: clientIp,
          consent_version: CONSENT_VERSION
        });

      if (error) throw error;

      // Log the consent action
      await supabase.rpc('log_security_event', {
        p_action: 'parental_consent_given',
        p_resource_type: 'parental_consent',
        p_resource_id: studentId,
        p_details: {
          parent_email: parentEmail,
          school_id: schoolId,
          consent_version: CONSENT_VERSION
        }
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
          This student is under 18 years old. Parental consent is required under FERPA before we can collect and process student data.
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
              <li>Test completion timestamps</li>
              <li>Student identification numbers (provided by school)</li>
            </ul>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-semibold">How We Use This Data:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>To evaluate language proficiency using AI-powered assessment</li>
              <li>To generate test scores and certificates</li>
              <li>To provide results to the student's school</li>
              <li>We do NOT sell or share data with third parties for marketing</li>
            </ul>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-semibold">Your Rights:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>You can view your child's data at any time</li>
              <li>You can request data deletion</li>
              <li>You can export data in portable format</li>
              <li>You can revoke consent at any time</li>
            </ul>
            <p className="text-sm mt-2">
              Data will be retained for 3 years after test completion, then permanently deleted.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Full Name</Label>
              <Input
                id="parentName"
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                placeholder="Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                required
                placeholder="parent@example.com"
              />
              <p className="text-xs text-muted-foreground">
                A confirmation email will be sent to this address
              </p>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                I consent to Palavox collecting and processing my child's educational data as described above. 
                I understand this data will be used only for language proficiency testing and will be shared 
                with my child's school. I have read the{" "}
                <a href="/privacy-policy" target="_blank" className="text-primary underline">
                  Privacy Policy
                </a>{" "}
                and understand my rights under FERPA.
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !consentGiven}>
            {isLoading ? "Submitting..." : "Provide Parental Consent"}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            <p>Questions? Contact privacy@palavox.org</p>
            <p>To revoke consent: privacy@palavox.org</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
