import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
              <p>
                This Privacy Policy describes how Palavox ("we," "us," or "our") collects, uses, and protects
                information from students, parents, and educational institutions using our language proficiency
                testing platform.
              </p>
              <p className="font-semibold">
                We are committed to FERPA compliance and protecting student educational records.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-2">2.1 Student Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identification Data:</strong> School ID, Student ID (provided via certification codes)</li>
                <li><strong>Account Data:</strong> Email address, password (encrypted), date of birth</li>
                <li><strong>Test Data:</strong> Test responses, scores, audio recordings of speaking tests, written responses</li>
                <li><strong>Usage Data:</strong> Test session timestamps, IP addresses, browser information</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Parental Information (for minors under 18)</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Parent/guardian name and email address</li>
                <li>Electronic consent records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Assessment:</strong> To evaluate language proficiency and generate test scores</li>
                <li><strong>Certification:</strong> To issue language proficiency certificates</li>
                <li><strong>AI Processing:</strong> Test responses are processed by OpenAI's GPT models for automated grading. 
                    Audio transcripts are processed using Azure Speech Services and AWS Polly for text-to-speech.</li>
                <li><strong>Service Improvement:</strong> Anonymized, aggregated data may be used to improve test quality</li>
                <li><strong>Communication:</strong> To send test results and important service updates</li>
              </ul>
              <p className="mt-4 p-4 bg-muted rounded-lg">
                <strong>Important:</strong> We do NOT use individual student data for marketing purposes. 
                We do NOT sell student data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
              <p>We share student education records only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>With Schools:</strong> Test results are shared with the educational institution that issued the certification code</li>
                <li><strong>With Parents:</strong> Parents of minor students can access their child's test data</li>
                <li><strong>Service Providers:</strong> We use the following third-party services:
                  <ul className="list-disc pl-6 mt-2">
                    <li>Supabase (database hosting, authentication)</li>
                    <li>OpenAI (AI-powered test evaluation)</li>
                    <li>Azure Speech Services (speech-to-text)</li>
                    <li>AWS Polly (text-to-speech)</li>
                    <li>Stripe (payment processing)</li>
                  </ul>
                  All service providers are contractually required to protect student data.
                </li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. FERPA Rights</h2>
              <p>Under the Family Educational Rights and Privacy Act (FERPA), parents and eligible students have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Inspect and Review:</strong> View all education records we maintain</li>
                <li><strong>Request Amendment:</strong> Request corrections to inaccurate records</li>
                <li><strong>Consent to Disclosure:</strong> Control disclosure of education records (with limited exceptions)</li>
                <li><strong>File Complaints:</strong> File a complaint with the U.S. Department of Education regarding FERPA violations</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us at: <strong>privacy@palavox.org</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Data Security</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>All data is encrypted in transit (TLS/SSL) and at rest</li>
                <li>Access to student data is limited to authorized personnel only</li>
                <li>We maintain comprehensive audit logs of data access</li>
                <li>Regular security assessments and updates</li>
                <li>Password requirements meet industry standards</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p>
                We retain student education records for <strong>3 years</strong> after the test completion date, 
                unless a longer retention period is required by your school district or state law.
              </p>
              <p className="mt-2">
                After the retention period, data is permanently deleted from our systems. Schools or parents 
                may request earlier deletion by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Parental Consent (Minors Under 18)</h2>
              <p>
                For students under 18 years of age, we require verifiable parental consent before collecting 
                personal information. Parents will receive an email explaining what data is collected and how 
                it will be used.
              </p>
              <p className="mt-2">
                Parents may revoke consent at any time by contacting <strong>privacy@palavox.org</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Student Rights Portal</h2>
              <p>
                Students and parents can access the Student Data Portal to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>View all stored test data</li>
                <li>Export data in portable format (PDF/JSON)</li>
                <li>Request data deletion</li>
                <li>Review consent records</li>
              </ul>
              <p className="mt-2">
                Access the portal at: <strong>/student-portal</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Data Breach Notification</h2>
              <p>
                In the event of a data breach affecting student education records, we will notify:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Affected schools within 72 hours</li>
                <li>Parents of affected students within 72 hours</li>
                <li>Relevant regulatory authorities as required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. Material changes will be communicated to 
                schools and parents via email. Continued use of the service after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Contact Information</h2>
              <div className="space-y-2">
                <p><strong>Privacy Officer:</strong> privacy@palavox.org</p>
                <p><strong>FERPA Compliance Questions:</strong> ferpa@palavox.org</p>
                <p><strong>Data Access Requests:</strong> dataaccess@palavox.org</p>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-semibold">U.S. Department of Education - FERPA Office</p>
                <p>Student Privacy Policy Office</p>
                <p>400 Maryland Avenue, SW</p>
                <p>Washington, D.C. 20202-8520</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
