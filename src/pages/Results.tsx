import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import GradingRubric from '@/components/test/GradingRubric';
import { Award, CheckCircle, User, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUILanguage } from '@/contexts/UILanguageContext';
import {
  fetchSessionResults,
  issueCertificate,
  type ServerCertificate,
} from '@/services/test/secureTestService';

/**
 * Results are READ-ONLY here.
 *
 * Every number on this page was produced and stored by a service-role edge
 * function. There is deliberately no scoring, no level mapping and no
 * "force recalculation" in this component — if the server did not write it,
 * it is not shown.
 */

type SectionRow = {
  raw_score: number | null;
  cefr_level: string | null;
  rubric_scores: Record<string, unknown> | null;
  evidence: unknown;
  test_sections?: { section_type?: string } | null;
};

const SECTION_TITLES: Record<string, string> = {
  reading: 'Reading Comprehension',
  listening: 'Listening Comprehension',
  writing: 'Written Production',
  speaking: 'Spoken Production',
  conversation: 'Conversational Fluency',
};

const Results = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useUILanguage();

  const sessionId = searchParams.get('session');
  const phaseParam = searchParams.get('phase');

  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState<any>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [certificate, setCertificate] = useState<ServerCertificate | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/test-history');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchSessionResults(sessionId);
        if (cancelled) return;
        setOverall(data.overall);
        setSections((data.sections ?? []) as unknown as SectionRow[]);
        setCertificate((data.certificate as unknown as ServerCertificate) ?? null);
      } catch (error) {
        console.error('Error loading results:', error);
        toast.error('Could not load your results.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  const handleIssueCertificate = async () => {
    if (!sessionId) return;
    setIssuing(true);
    try {
      const cert = await issueCertificate(sessionId);
      setCertificate(cert);
      toast.success('Certificate issued and stored for verification.');
    } catch (error) {
      console.error('Error issuing certificate:', error);
      toast.error(error instanceof Error ? error.message : 'Could not issue your certificate.');
    } finally {
      setIssuing(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certificate) return;
    setGeneratingReport(true);
    try {
      const { generateCertificate } = await import('@/utils/certificateGenerator');
      const blob = await generateCertificate(certificate, { phase: phaseParam ?? undefined });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `palavox-certificate-${certificate.verification_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Certificate downloaded.');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Could not generate the certificate image.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-palavox-ivory">
        <Navbar />
        <main className="flex-grow container-custom py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-palavox-purple mb-4 mx-auto"></div>
            <h2 className="text-2xl font-bold">{t.results.loadingResults}</h2>
          </div>
        </main>
      </div>
    );
  }

  if (!overall) {
    return (
      <div className="flex flex-col min-h-screen bg-palavox-ivory">
        <Navbar />
        <main className="flex-grow container-custom py-16">
          <Card className="max-w-xl mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-bold">Results are not ready yet</h1>
              <p className="text-palavox-slate">
                Your answers are still being scored on our servers, or this session was not
                completed. Scores are never calculated in your browser, so please check back
                in a moment.
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild variant="outline"><Link to="/test-history">Test history</Link></Button>
                <Button asChild><Link to="/test">Take a test</Link></Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const score = Number(overall.overall_score ?? 0);

  return (
    <div className="flex flex-col min-h-screen bg-palavox-ivory">
      <Navbar />

      <main className="flex-grow container-custom py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex p-2 rounded-full bg-palavox-lavender mb-4">
              <CheckCircle className="h-8 w-8 text-palavox-purple" />
            </div>
            <h1 className="text-4xl font-bold mb-2">{t.results.title}</h1>
            <p className="text-palavox-slate text-lg">
              {phaseParam
                ? `${phaseParam.charAt(0).toUpperCase()}${phaseParam.slice(1)} Assessment`
                : 'English Language Proficiency Assessment'}
            </p>
            <p className="mt-2 text-xs text-palavox-slate/70 inline-flex items-center gap-1 justify-center">
              <ShieldCheck className="h-3.5 w-3.5" /> Scored on our servers — results cannot be edited from this device
            </p>
          </div>

          {/* Non-accreditation disclaimer */}
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-medium text-blue-900">Assessment Guidance &amp; Accuracy Notice</p>
                  <p>
                    This assessment is designed for <strong>self-assessment, progress tracking and placement
                    guidance</strong>. While our AI-assisted scoring strives for accuracy, results may contain
                    inaccuracies and should not be treated as definitive measures of proficiency.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Regarding certifications:</strong> Palavox Cert does not issue official, accredited
                    language certifications. Based on your performance here, we believe you would be capable of
                    achieving the indicated proficiency level on an accredited examination (such as ACTFL or CEFR)
                    with the same level of honest effort.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 overflow-hidden border-t-4 border-t-palavox-purple">
            <CardHeader className="bg-palavox-lavender py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-palavox-purple">
                  {t.results.languageProficiencyAssessment}
                </h2>
                <div className="flex items-center">
                  <Award className="h-6 w-6 text-palavox-gold mr-2" />
                  <span className="text-lg font-medium text-palavox-purple">
                    {new Date(overall.created_at ?? Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="inline-block rounded-full h-36 w-36 bg-palavox-lavender p-2 mb-4">
                    <div className="h-full w-full rounded-full bg-palavox-ivory flex items-center justify-center border-4 border-palavox-purple">
                      <span className="text-4xl font-bold text-palavox-purple">{score.toFixed(1)}%</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-medium text-palavox-slate mb-1">{t.results.overallScore}</h3>
                  {overall.confidence_band && (
                    <p className="text-sm text-palavox-slate/70">Confidence: {overall.confidence_band}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-medium text-palavox-slate mb-3">
                    {t.results.proficiencyLevel}
                  </h3>
                  <div className="inline-block text-3xl font-bold px-6 py-3 rounded-lg border bg-blue-100 text-blue-800 border-blue-300">
                    {overall.overall_cefr}
                  </div>
                  {overall.functional_label && (
                    <p className="mt-3 text-palavox-slate">{overall.functional_label}</p>
                  )}
                  {overall.retake_recommended && (
                    <p className="mt-3 text-sm text-amber-700">
                      A retake is recommended for a more reliable result.
                    </p>
                  )}
                </div>
              </div>

              {sessionId && (
                <>
                  <Separator className="my-8" />
                  <ProficiencyBands sessionId={sessionId} />
                </>
              )}

              {sections.length > 0 && (
                <>
                  <Separator className="my-8" />
                  <h3 className="text-xl font-bold mb-4">{t.results.breakdown}</h3>
                  <div className="space-y-4">
                    {sections.map((s, i) => {
                      const type = s.test_sections?.section_type ?? 'section';
                      return (
                        <div key={i} className="bg-gray-50 rounded-lg p-4 border-l-4 border-palavox-purple">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-lg text-palavox-purple">
                              {SECTION_TITLES[type] ?? type}
                            </h4>
                            <div className="flex items-center gap-3">
                              {s.cefr_level && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                  {s.cefr_level}
                                </span>
                              )}
                              <span className="text-2xl font-bold text-palavox-purple">
                                {Number(s.raw_score ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          {s.rubric_scores && (
                            <div className="mt-3 grid sm:grid-cols-2 gap-2">
                              {Object.entries(s.rubric_scores as Record<string, unknown>)
                                .filter(([, v]) => typeof v === 'number')
                                .map(([trait, v]) => (
                                  <div key={trait} className="flex justify-between text-sm">
                                    <span className="capitalize text-palavox-slate">
                                      {trait.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span className="font-medium">{String(v)}/5</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {(Array.isArray(overall.strengths) && overall.strengths.length > 0) ||
              (Array.isArray(overall.next_steps) && overall.next_steps.length > 0) ? (
                <>
                  <Separator className="my-8" />
                  <div className="grid md:grid-cols-2 gap-6">
                    {Array.isArray(overall.strengths) && overall.strengths.length > 0 && (
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <h4 className="font-medium text-emerald-900 mb-2">Strengths</h4>
                        <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
                          {overall.strengths.map((sItem: string, i: number) => <li key={i}>{sItem}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(overall.next_steps) && overall.next_steps.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">{t.results.recommendations}</h4>
                        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                          {overall.next_steps.map((sItem: string, i: number) => <li key={i}>{sItem}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              <Separator className="my-8" />

              {/* Server-issued, verifiable certificate */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Award className="h-7 w-7 text-palavox-gold mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-palavox-purple mb-1">Verifiable certificate</h3>
                    {certificate ? (
                      <div className="space-y-3">
                        <p className="text-sm text-palavox-slate">
                          Issued to <strong>{certificate.holder_name || 'your account name'}</strong> at level{' '}
                          <strong>{certificate.cefr_level}</strong>.
                        </p>
                        <p className="text-xs text-palavox-slate/80">
                          Verification code <code className="font-mono">{certificate.verification_code}</code> —
                          anyone can confirm it at{' '}
                          <Link className="underline" to={`/verify?id=${certificate.id}`}>
                            /verify?id={certificate.id.slice(0, 8)}…
                          </Link>
                        </p>
                        <Button onClick={handleDownloadCertificate} disabled={generatingReport}>
                          <FileText className="mr-2 h-4 w-4" />
                          {generatingReport ? 'Preparing…' : 'Download certificate'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-palavox-slate">
                          Your certificate is generated and signed on our servers, stored against your result and
                          checkable by any school or employer.
                        </p>
                        <Button onClick={handleIssueCertificate} disabled={issuing}>
                          <Award className="mr-2 h-4 w-4" />
                          {issuing ? 'Issuing…' : 'Issue my certificate'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <Button asChild variant="outline">
                    <Link to="/">{t.results.returnToHome}</Link>
                  </Button>
                  {user && (
                    <Button asChild variant="outline">
                      <Link to="/test-history">{t.results.viewTestHistory}</Link>
                    </Button>
                  )}
                </div>
                <Button asChild>
                  <Link to="/test">{t.results.takeAnotherTest}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <GradingRubric phase={phaseParam ?? 'certification'} />

          <div className="text-center mt-12">
            <p className="text-sm text-palavox-slate">{t.results.palavoxAssessments}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
