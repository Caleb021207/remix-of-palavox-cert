import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Palavox language testing platform ("Service"), you agree to be bound by 
                these Terms of Service ("Terms"). If you are using the Service on behalf of a school or educational 
                institution, you represent that you have authority to bind that entity to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Service Description</h2>
              <p>
                Palavox provides online language proficiency testing and certification services. Our platform uses 
                AI-powered evaluation to assess reading, writing, listening, and speaking skills.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. User Eligibility</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Students under 18 must have parental consent to use the Service</li>
                <li>Schools must enter into a School Service Agreement for institutional use</li>
                <li>Users must provide accurate information during registration</li>
                <li>One account per user; account sharing is prohibited</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Certification Codes</h2>
              <p>
                Schools issue certification codes to students for test access. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use certification codes only as authorized by your school</li>
                <li>Not share or transfer certification codes</li>
                <li>Notify your school immediately if a code is compromised</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. User Conduct</h2>
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to cheat, manipulate test results, or use unauthorized assistance</li>
                <li>Reverse engineer or attempt to access source code</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Impersonate another user or provide false identity information</li>
                <li>Interfere with or disrupt the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Academic Integrity</h2>
              <p className="p-4 bg-muted rounded-lg font-semibold">
                All tests must be completed independently without unauthorized assistance. Violations may result 
                in test invalidation, account suspension, and notification to your school.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Intellectual Property</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>All test content, questions, and materials are proprietary to Palavox</li>
                <li>You may not copy, reproduce, or distribute test materials</li>
                <li>Test results and certificates are for personal/educational use only</li>
                <li>Screenshots or recordings of test content are prohibited</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Payment and Refunds</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payments are processed securely through Stripe</li>
                <li>Fees are non-refundable except as required by law</li>
                <li>Schools may have separate billing arrangements</li>
                <li>Promotional codes are non-transferable and subject to terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Test Results and Certificates</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Results are typically available within 24 hours of test completion</li>
                <li>Certificates are digital and sent via email</li>
                <li>We reserve the right to review and void suspicious test results</li>
                <li>Results are valid for educational and employment purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Privacy and Data Protection</h2>
              <p>
                Your use of the Service is governed by our Privacy Policy, which is incorporated into these Terms 
                by reference. We are FERPA-compliant and protect student education records.
              </p>
              <p className="mt-2">
                Key privacy commitments:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We do not sell student data</li>
                <li>AI processing is used only for test evaluation</li>
                <li>Data is encrypted and securely stored</li>
                <li>Parents and students can access and delete data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Service Availability</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>We strive for 99.9% uptime but do not guarantee uninterrupted access</li>
                <li>Scheduled maintenance will be announced in advance when possible</li>
                <li>We are not liable for disruptions beyond our reasonable control</li>
                <li>In-progress tests affected by technical issues may be restarted</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Disclaimers</h2>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-semibold">THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We do not guarantee specific test scores or proficiency levels</li>
                  <li>AI evaluation may contain errors; human review is available upon request</li>
                  <li>Test results are assessments, not guarantees of language ability</li>
                  <li>Third-party services (OpenAI, AWS, Azure) have their own terms</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PALAVOX SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Indirect, incidental, special, or consequential damages</li>
                <li>Lost profits, data, or opportunities</li>
                <li>Damages exceeding the amount paid for the Service in the past 12 months</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Termination</h2>
              <p>We may suspend or terminate your access if you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent or abusive behavior</li>
                <li>Fail to pay fees (if applicable)</li>
                <li>Are inactive for more than 3 years</li>
              </ul>
              <p className="mt-2">
                You may request account deletion at any time via privacy@palavox.org
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">15. Dispute Resolution</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Governed by the laws of [Your State/Country]</li>
                <li>Disputes will be resolved through binding arbitration</li>
                <li>You waive the right to class action lawsuits</li>
                <li>You may opt out of arbitration within 30 days of account creation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">16. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. Material changes will be communicated via email at least 
                30 days in advance. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">17. Contact Information</h2>
              <div className="space-y-2">
                <p><strong>General Inquiries:</strong> support@palavox.org</p>
                <p><strong>Legal/Compliance:</strong> legal@palavox.org</p>
                <p><strong>Schools:</strong> schools@palavox.org</p>
                <p><strong>Technical Support:</strong> tech@palavox.org</p>
              </div>
            </section>

            <section className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">
                By creating an account or using the Service, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
