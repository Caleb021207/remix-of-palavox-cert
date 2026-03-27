import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";

const SchoolServiceAgreement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">School Service Agreement</CardTitle>
            <p className="text-sm text-muted-foreground">FERPA-Compliant Data Processing Agreement</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">
                This School Service Agreement Template is provided for educational institutions to ensure FERPA compliance.
                Contact legal@palavox.org to execute a customized agreement for your school.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-3">School Service Agreement</h2>
              <p className="text-sm text-muted-foreground">
                Between [School Name] ("School") and Palavox ("Service Provider")
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Purpose and Scope</h2>
              <p>
                This Agreement governs Service Provider's access to and use of student education records, as defined 
                under the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g.
              </p>
              <p className="mt-2">
                Service Provider will provide online language proficiency testing and certification services to students 
                designated by the School.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. FERPA Compliance</h2>
              
              <h3 className="text-xl font-semibold mb-2">2.1 School Official Status</h3>
              <p>
                Service Provider acknowledges that it is acting as a "school official" with legitimate educational 
                interests in student education records for the sole purpose of providing the contracted services.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Data Ownership</h3>
              <p>
                The School retains ownership of all student education records. Service Provider is a custodian acting 
                on behalf of the School.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.3 Permitted Uses</h3>
              <p>Service Provider may use student education records ONLY to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Administer language proficiency tests</li>
                <li>Generate test scores and certificates</li>
                <li>Provide results to the School and authorized personnel</li>
                <li>Improve test quality using anonymized, aggregated data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Prohibited Uses</h2>
              <p>Service Provider shall NOT:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use student data for marketing or commercial purposes</li>
                <li>Sell, rent, or trade student education records</li>
                <li>Create student profiles for non-educational purposes</li>
                <li>Disclose student data to third parties without School consent (except as required by law)</li>
                <li>Use student data to train AI models for commercial sale</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Collection</h2>
              
              <h3 className="text-xl font-semibold mb-2">4.1 Student Data Collected</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Student identification numbers (School ID, Student ID)</li>
                <li>Test responses (written, spoken, multiple choice)</li>
                <li>Audio recordings of speaking assessments</li>
                <li>Test scores and proficiency levels</li>
                <li>Test completion timestamps</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Minimization Principle</h3>
              <p>
                Service Provider collects only the minimum data necessary to provide the testing services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
              <p>Service Provider shall implement and maintain:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> TLS 1.3 for data in transit; AES-256 for data at rest</li>
                <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
                <li><strong>Audit Logging:</strong> Comprehensive logs of all data access and modifications</li>
                <li><strong>Security Assessments:</strong> Annual third-party security audits</li>
                <li><strong>Employee Training:</strong> Annual FERPA compliance training for all staff</li>
                <li><strong>Incident Response:</strong> Written data breach response plan</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Subprocessors and Third Parties</h2>
              
              <h3 className="text-xl font-semibold mb-2">6.1 Approved Subprocessors</h3>
              <p>Service Provider uses the following subprocessors:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase:</strong> Database hosting and authentication</li>
                <li><strong>OpenAI:</strong> AI-powered test evaluation (GPT models)</li>
                <li><strong>Microsoft Azure:</strong> Speech-to-text services</li>
                <li><strong>Amazon Web Services:</strong> Text-to-speech services</li>
                <li><strong>Stripe:</strong> Payment processing (school billing only)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">6.2 Subprocessor Requirements</h3>
              <p>
                All subprocessors are contractually required to maintain FERPA-compliant data protection standards 
                equivalent to this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention and Deletion</h2>
              
              <h3 className="text-xl font-semibold mb-2">7.1 Retention Period</h3>
              <p>
                Student education records will be retained for <strong>3 years</strong> after test completion, 
                or as specified by the School, whichever is shorter.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">7.2 Deletion Upon Request</h3>
              <p>
                Upon written request from the School, Service Provider will delete student data within 30 days.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">7.3 Agreement Termination</h3>
              <p>
                Upon termination of this Agreement, Service Provider will either:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Delete all student education records within 60 days, OR</li>
                <li>Return student data to the School in portable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Data Breach Notification</h2>
              
              <h3 className="text-xl font-semibold mb-2">8.1 Notification Timeline</h3>
              <p>
                Service Provider will notify the School within <strong>72 hours</strong> of discovering any unauthorized 
                access, use, or disclosure of student education records.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">8.2 Notification Content</h3>
              <p>Breach notifications shall include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nature and scope of the breach</li>
                <li>Types of data compromised</li>
                <li>Number of affected students</li>
                <li>Remediation steps taken</li>
                <li>Contact information for questions</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">8.3 School's Right to Notify</h3>
              <p>
                The School retains the right to notify affected students, parents, and regulatory authorities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Parental Rights and Access</h2>
              <p>Service Provider will facilitate:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Parental access to student education records within 45 days of request</li>
                <li>Amendment of inaccurate records as directed by the School</li>
                <li>Export of student data in portable format</li>
                <li>Deletion of records upon parental request (with School approval)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. School's Rights and Audit</h2>
              
              <h3 className="text-xl font-semibold mb-2">10.1 Audit Rights</h3>
              <p>
                The School may audit Service Provider's compliance with this Agreement upon 30 days' notice, 
                not more than once per year.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">10.2 Reports and Transparency</h3>
              <p>Service Provider will provide:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Quarterly usage reports</li>
                <li>Annual security assessment summaries</li>
                <li>Documentation of subprocessor changes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Indemnification</h2>
              <p>
                Service Provider agrees to indemnify and hold harmless the School from any claims, damages, or 
                penalties arising from Service Provider's violation of FERPA or this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Termination</h2>
              <p>Either party may terminate this Agreement:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With 90 days' written notice</li>
                <li>Immediately for material breach of FERPA compliance</li>
                <li>Immediately for data breach affecting student records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">Service Provider:</p>
                  <p>Palavox</p>
                  <p>FERPA Compliance Officer: ferpa@palavox.org</p>
                  <p>Legal Department: legal@palavox.org</p>
                </div>
                <div>
                  <p className="font-semibold">School:</p>
                  <p>[School Name]</p>
                  <p>[School Address]</p>
                  <p>[Contact Email]</p>
                </div>
              </div>
            </section>

            <div className="p-4 bg-primary/10 rounded-lg mt-8">
              <p className="font-semibold text-center">
                This template is provided for informational purposes. Schools must execute a customized, 
                legally binding agreement before sharing student data with Palavox.
              </p>
              <p className="text-center mt-2">
                Contact <strong>schools@palavox.org</strong> to begin the agreement process.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolServiceAgreement;
