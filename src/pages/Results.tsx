
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ScoringDebugPanel from '@/components/test/ScoringDebugPanel';
import GradingRubric from '@/components/test/GradingRubric';
import { TestSession, CEFRLevel, TestType, TestPhase } from '@/types';
import { generateFeedback, formatTestFeedback, determineCEFRLevel, determineACTFLLevel } from '@/utils/scoring';
import { generateScoreReport } from '@/utils/scoreReportGenerator';
import { Award, FileText, CheckCircle, BarChart3, User, Book, AlertTriangle, MessageCircle } from 'lucide-react';
import { CERTIFICATE_TIERS, checkCertificateEligibility } from '@/config/testConfig';
import { saveTestSession } from '@/services/test/sessionService';
import { useAuth } from '@/hooks/useAuth';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { supabase } from '@/integrations/supabase/client';

const Results = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useUILanguage();
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [rubricScores, setRubricScores] = useState<any>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('testSession');
    const savedValidation = localStorage.getItem('scoringValidation');
    
    if (!savedSession) {
      navigate('/test');
      return;
    }
    
    try {
      const parsedSession: TestSession = JSON.parse(savedSession);
      
      // Convert string dates back to Date objects if needed
      if (parsedSession.startTime && typeof parsedSession.startTime === 'string') {
        parsedSession.startTime = new Date(parsedSession.startTime);
      }
      if (parsedSession.endTime && typeof parsedSession.endTime === 'string') {
        parsedSession.endTime = new Date(parsedSession.endTime);
      }
      
      // FORCE RECALCULATION: Use unified CEFR determination to ensure consistency
      if (parsedSession.score !== undefined) {
        console.log('🔄 Results Page: Recalculating CEFR/ACTFL levels for consistency');
        console.log('📊 Original session data:', {
          score: parsedSession.score,
          cefr: parsedSession.cefr,
          actfl: parsedSession.actfl
        });
        
        // Use our unified CEFR determination logic
        const correctedCEFR = determineCEFRLevel(parsedSession.score);
        const correctedACTFL = determineACTFLLevel(parsedSession.score);
        
        console.log('✅ Corrected levels:', {
          score: parsedSession.score,
          cefr: correctedCEFR,
          actfl: correctedACTFL
        });
        
        // Update the session with corrected levels
        const correctedSession = {
          ...parsedSession,
          cefr: correctedCEFR,
          actfl: correctedACTFL
        };
        
        setSession(correctedSession);
        
        // Update localStorage with corrected data
        localStorage.setItem('testSession', JSON.stringify(correctedSession));
        
        // Save to database if user is authenticated
        if (user && !sessionSaved) {
          saveSessionToDatabase(correctedSession);
        }
      } else {
        setSession(parsedSession);
        
        // Save to database if user is authenticated
        if (user && !sessionSaved) {
          saveSessionToDatabase(parsedSession);
        }
      }
      
      if (savedValidation) {
        setValidationData(JSON.parse(savedValidation));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error parsing test session:', error);
      toast.error('Error loading results. Could not load your test results');
      navigate('/test');
    }
  }, [navigate, user, sessionSaved]);

  // Fetch rubric scores for detailed trait analysis
  useEffect(() => {
    const fetchRubricScores = async () => {
      if (!session?.id) return;
      
      const { data, error } = await supabase
        .from('rubric_scores')
        .select('*')
        .eq('test_session_id', session.id);
      
      if (error) {
        console.error('Error fetching rubric scores:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const scores = {
          writing: data.find(s => s.phase === 'writing'),
          conversation: data.find(s => s.phase === 'conversation')
        };
        setRubricScores(scores);
        console.log('📊 Rubric scores loaded:', scores);
      }
    };
    
    fetchRubricScores();
  }, [session?.id]);

  const saveSessionToDatabase = async (sessionData: TestSession) => {
    try {
      console.log('💾 Saving test session to database...');
      console.log('Session data before saving:', {
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        startTimeType: typeof sessionData.startTime,
        endTimeType: typeof sessionData.endTime
      });
      
      await saveTestSession(sessionData);
      
      setSessionSaved(true);
      console.log('✅ Test session saved to database');
      toast.success('Test results saved to your account');
    } catch (error) {
      console.error('❌ Error saving test session to database:', error);
      // Don't show error to user since the results are still available locally
    }
  };

  if (loading || !session) {
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

  const getLevelColor = (level: CEFRLevel) => {
    switch (level) {
      case CEFRLevel.C2:
      case CEFRLevel.C1:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case CEFRLevel.B2:
      case CEFRLevel.B1:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case CEFRLevel.A2:
      case CEFRLevel.A1:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const getTestTypeIcon = () => {
    switch (session.testType) {
      case TestType.Speaking:
        return <User className="h-8 w-8 text-palavox-purple" />;
      case TestType.Writing:
        return <Book className="h-8 w-8 text-palavox-purple" />;
      case TestType.MultipleChoice:
      default:
        return <FileText className="h-8 w-8 text-palavox-purple" />;
    }
  };
  
  const getTestTypeName = () => {
    switch (session.testType) {
      case TestType.Speaking:
        return 'Speaking Test';
      case TestType.Writing:
        return 'Writing Test';
      case TestType.MultipleChoice:
      default:
        return 'Multiple Choice Test';
    }
  };

  // Handle score report download - now properly async
  const handleDownloadReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Check if this is a single phase test
      const isSinglePhase = !!(session as any).singlePhase;
      
      if (isSinglePhase) {
        // For single phase, generate a simple certificate
        const { generateCertificate } = await import('@/utils/certificateGenerator');
        const pngBlob = await generateCertificate(session, (session as any).singlePhase);
        
        // Create a download link
        const url = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `palavox-${(session as any).singlePhase}-certificate-${session.id}.png`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Phase certificate downloaded successfully!');
      } else {
        // Generate the comprehensive score report for full test
        const pngBlob = await generateScoreReport(session);
        
        // Create a download link
        const url = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `palavox-score-report-${session.id}.png`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Score report downloaded successfully!');
      }
    } catch (error) {
      console.error('Error generating score report:', error);
      toast.error('Failed to generate score report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleReportIssue = () => {
    const reportData = {
      sessionId: session.id,
      score: session.score,
      cefr: session.cefr,
      timestamp: new Date().toISOString(),
      validationData,
      userAgent: navigator.userAgent
    };
    
    const reportText = `Score Report Issue - Session ${session.id}\n\n` +
      `Details:\n${JSON.stringify(reportData, null, 2)}\n\n` +
      `User Description: [Please describe the issue here]`;
    
    // Copy to clipboard for now - in a real app this would submit to support
    navigator.clipboard.writeText(reportText);
    toast.success('Issue report copied to clipboard. Please send this to our support team.');
  };

  const score = session.score || 0;
  const cefr = session.cefr || CEFRLevel.A1;
  const formattedFeedback = formatTestFeedback(session);
  const isSinglePhase = !!(session as any).singlePhase;
  
  // Check certificate eligibility for multi-phase tests
  let certificateEligibility = null;
  if (!isSinglePhase && session.phaseScores) {
    certificateEligibility = checkCertificateEligibility({
      comprehension: session.phaseScores[TestPhase.Comprehension],
      writing: session.phaseScores[TestPhase.Writing],
      conversation: session.phaseScores[TestPhase.Conversation]
    });
  }

  // Check if there might be scoring issues
  const hasValidationConcerns = validationData && (
    validationData.scoringMethod !== 'enhanced' ||
    (session.feedback?.scoring_breakdown?.method_breakdown && 
     Array.isArray(session.feedback.scoring_breakdown.method_breakdown) &&
     session.feedback.scoring_breakdown.method_breakdown.some((item: any) => 
      item.method === 'no-match' || item.method === 'text-mismatch'
    ))
  );

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
              {isSinglePhase ? `${(session as any).singlePhase.charAt(0).toUpperCase()}${(session as any).singlePhase.slice(1)} Assessment` : getTestTypeName()}
            </p>
            {validationData && (
              <p className="text-sm text-gray-600 mt-2">
                {t.results.scoredUsing.replace('{timestamp}', validationData.timestamp ? new Date(validationData.timestamp).toLocaleString() : t.results.recentlyCompleted)}
              </p>
            )}
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
              {t.results.liveScoring.replace('{actfl}', session.actfl || 'N/A').replace('{score}', score.toFixed(1))}
            </div>
          </div>
          
          {hasValidationConcerns && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{t.results.scoreValidationNotice}</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                {t.results.scoreValidationDescription}
              </p>
            </div>
          )}
          
          {/* Assessment Disclaimer */}
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-medium text-blue-900">
                    Assessment Guidance & Accuracy Notice
                  </p>
                  <p>
                    This assessment is designed for <strong>self-assessment, progress tracking, and placement guidance</strong>. While our AI-powered testing strives for accuracy, results may contain inaccuracies and should not be considered definitive measures of proficiency.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Regarding Certifications:</strong> Palavox Cert does not issue official, accredited language certifications. However, based on your performance in our assessment, we believe you would be capable of achieving the indicated proficiency level on an accredited examination (such as ACTFL, CEFR, or similar) with the same level of honest effort and performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Achievement Section */}
          {!isSinglePhase && certificateEligibility && (
            <Card className="mb-8 overflow-hidden">
              <CardHeader className={`py-6 ${
                certificateEligibility.qualified 
                  ? 'bg-gradient-to-r from-emerald-50 to-blue-50' 
                  : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  {certificateEligibility.qualified ? (
                    <>
                      <Award className="h-8 w-8 text-palavox-gold" />
                      <div>
                        <h3 className="text-2xl font-bold text-emerald-700">
                          🎉 Certificate Earned!
                        </h3>
                        <p className="text-sm text-emerald-600 mt-1">
                          {CERTIFICATE_TIERS[certificateEligibility.tier].name}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-700">
                          Keep Practicing!
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          You're building your proficiency
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {certificateEligibility.qualified ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-emerald-800 font-medium mb-2">
                        {CERTIFICATE_TIERS[certificateEligibility.tier].description}
                      </p>
                      <p className="text-emerald-700 text-sm">
                        You demonstrated <strong>{CERTIFICATE_TIERS[certificateEligibility.tier].actflLevel}</strong> proficiency across all skill areas.
                      </p>
                    </div>
                    <Button 
                      variant="default" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleDownloadReport}
                      disabled={generatingReport}
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Download Your Certificate
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 font-medium mb-3">
                        To earn a <strong>Functional Fluency Certificate</strong>, you need:
                      </p>
                      <div className="space-y-2 text-sm">
                        {certificateEligibility.needsImprovement && Object.entries(certificateEligibility.needsImprovement).map(([phase, needs]) => {
                          const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
                          const currentScore = session.phaseScores?.[phase as keyof typeof session.phaseScores] || 0;
                          const targetScore = CERTIFICATE_TIERS.functional.minimumPhaseScores[phase as keyof typeof CERTIFICATE_TIERS.functional.minimumPhaseScores];
                          
                          return (
                            <div key={phase} className="flex items-center justify-between">
                              <span className={needs ? 'text-blue-700' : 'text-emerald-700'}>
                                {needs ? '○' : '✓'} {phaseName}
                              </span>
                              <span className={`font-medium ${needs ? 'text-blue-800' : 'text-emerald-700'}`}>
                                {currentScore.toFixed(1)}% {needs && `→ Need ${targetScore}%`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-600">
                      <p className="mb-2">💪 You're close! Keep practicing and retake the test.</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/test')}
                      >
                        Take Test Again
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card className="mb-8 overflow-hidden border-t-4 border-t-palavox-purple">
            <CardHeader className="bg-palavox-lavender py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-palavox-purple">
                  {t.results.languageProficiencyAssessment}
                </h2>
                <div className="flex items-center">
                  <Award className="h-6 w-6 text-palavox-gold mr-2" />
                  <span className="text-lg font-medium text-palavox-purple">
                    {session.endTime ? new Date(session.endTime).toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-block rounded-full h-36 w-36 bg-palavox-lavender p-2 mb-4">
                      <div className="h-full w-full rounded-full bg-palavox-ivory flex items-center justify-center border-4 border-palavox-purple">
                        <span className="text-4xl font-bold text-palavox-purple">
                          {score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <h3 className="text-xl font-medium text-palavox-slate mb-1">
                      {t.results.overallScore}
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {session.testType === TestType.MultipleChoice && session.questions && (
                      <div className="text-sm text-palavox-slate space-y-1">
                        <p>
                          <span className="font-medium">{t.results.questions}</span> {session.questions?.length || 0} {t.results.questionsTotal}
                        </p>
                        <p>
                          <span className="font-medium">{t.results.correct}</span> {Math.round((score / 100) * (session.questions?.length || 0))} {t.results.questionsAnswered}
                        </p>
                        {validationData && (
                          <p>
                            <span className="font-medium">{t.results.scoringMethod}</span> {validationData.scoringMethod || 'standard'}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      variant="default" 
                      className="w-full flex items-center justify-center bg-palavox-purple hover:bg-palavox-purple/90"
                      onClick={handleDownloadReport}
                      disabled={generatingReport}
                    >
                      {generatingReport ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent"></div>
                          {t.results.generatingReport}
                        </>
                      ) : (
                        <>
                          <BarChart3 className="mr-2 h-4 w-4" /> 
                          {isSinglePhase ? 'Download Phase Certificate' : t.results.downloadScoreReport}
                        </>
                      )}
                    </Button>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <p className="font-medium text-blue-900 mb-1">
                        {isSinglePhase ? 'Individual Phase Result' : t.results.comprehensiveAnalysis}
                      </p>
                      <p className="text-blue-700">
                        {isSinglePhase 
                          ? 'Your performance certificate for this specific skill area is ready for download.' 
                          : t.results.comprehensiveDescription}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-palavox-slate mb-3">
                      {t.results.proficiencyLevel}
                    </h3>
                    <div className={`inline-block text-3xl font-bold px-6 py-3 rounded-lg border ${getLevelColor(cefr)}`}>
                      {session.actfl || 'N/A'}
                    </div>
                    <div className="mt-2 text-xs text-palavox-slate/80">
                      ACTFL Standard
                    </div>
                    {cefr && (
                      <div className="mt-3 text-sm text-palavox-slate/70">
                        <span className="font-medium">CEFR Equivalent:</span>
                        <span className="ml-2">{cefr}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-palavox-slate mb-2">
                      {t.results.quickAssessment}
                    </h3>
                    <p className="text-palavox-slate">
                      {session.feedback?.summary || generateFeedback(score, cefr, session.testType)}
                    </p>
                  </div>

                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="font-medium text-green-900 mb-1">{t.results.aiTutoringAvailable}</p>
                    <p className="text-green-700 text-sm">{t.results.aiTutoringDescription}</p>
                  </div>
                </div>
              </div>
              
              {/* Phase Scores Breakdown */}
              {session.phaseScores && !isSinglePhase && (
                <>
                  <Separator className="my-8" />
                  
                  <h3 className="text-xl font-bold mb-4">{t.results.breakdown}</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(session.phaseScores as Record<string, number>).map(([phase, score]) => {
                      console.log('🔍 Rendering phase:', { phase, score });
                      if (!score || score <= 0) return null;
                      
                      const cefr = determineCEFRLevel(score);
                      const actfl = determineACTFLLevel(score);
                      const phaseTitle = phase === 'comprehension' 
                        ? 'Comprensión (Reading + Listening)'
                        : phase === 'writing'
                        ? 'Producción Escrita'
                        : phase === 'conversation'
                        ? 'Fluidez Conversacional'
                        : phase.charAt(0).toUpperCase() + phase.slice(1);
                      
                      return (
                        <div key={phase} className="bg-gray-50 rounded-lg p-4 border-l-4 border-palavox-purple">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-lg text-palavox-purple">{phaseTitle}</h4>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(cefr)}`}>
                                {cefr}
                              </span>
                              <span className="text-2xl font-bold text-palavox-purple">{score.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">ACTFL:</span> {actfl}
                          </div>
                          {session.feedback && (session.feedback as any)[phase] && (
                            <p className="text-sm mt-2">{(session.feedback as any)[phase]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              
              {/* Detailed Trait Analysis */}
              {rubricScores && (rubricScores.writing || rubricScores.conversation) && (
                <>
                  <Separator className="my-8" />
                  
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">Detailed Skill Analysis</h3>
                    <p className="text-muted-foreground">
                      Your performance broken down by specific language skills (0-5 scale)
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Writing Skills Card */}
                    {rubricScores.writing && (
                      <Card className="border-2 border-blue-200">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <h4 className="text-lg font-semibold text-blue-900">Writing Skills</h4>
                          </div>
                          {rubricScores.writing.recommended_cefr && (
                            <div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              Recommended Level: {rubricScores.writing.recommended_cefr}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          {Object.entries(rubricScores.writing.traits).map(([trait, score]: [string, any]) => (
                            <div key={trait} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium capitalize">
                                  {trait.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="text-lg font-bold text-blue-700">
                                  {score}/5
                                </span>
                              </div>
                              <div className="w-full bg-blue-100 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all" 
                                  style={{ width: `${(score as number) * 20}%` }}
                                />
                              </div>
                              {rubricScores.writing.notes?.[trait] && (
                                <p className="text-xs text-muted-foreground italic">
                                  {rubricScores.writing.notes[trait]}
                                </p>
                              )}
                            </div>
                          ))}
                          
                          {/* Length Adjustment Notice */}
                          {rubricScores.writing.length_adjustment !== 0 && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs text-amber-900">
                                Length adjustment: {rubricScores.writing.length_adjustment > 0 ? '+' : ''}
                                {rubricScores.writing.length_adjustment}% 
                                ({rubricScores.writing.validator_result?.wordCount} words)
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Conversation Skills Card */}
                    {rubricScores.conversation && (
                      <Card className="border-2 border-green-200">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                          <div className="flex items-center gap-3">
                            <User className="h-6 w-6 text-green-600" />
                            <h4 className="text-lg font-semibold text-green-900">Conversation Skills</h4>
                          </div>
                          {rubricScores.conversation.recommended_cefr && (
                            <div className="mt-2 inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              Recommended Level: {rubricScores.conversation.recommended_cefr}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          {Object.entries(rubricScores.conversation.traits).map(([trait, score]: [string, any]) => (
                            <div key={trait} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium capitalize">
                                  {trait}
                                </span>
                                <span className="text-lg font-bold text-green-700">
                                  {score}/5
                                </span>
                              </div>
                              <div className="w-full bg-green-100 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full transition-all" 
                                  style={{ width: `${(score as number) * 20}%` }}
                                />
                              </div>
                              {rubricScores.conversation.notes?.[trait] && (
                                <p className="text-xs text-muted-foreground italic">
                                  {rubricScores.conversation.notes[trait]}
                                </p>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Scoring Method Explanation */}
                  {session.feedback?.phaseWeights && (
                    <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <Award className="h-6 w-6 text-purple-600 mt-1" />
                          <div>
                            <h4 className="font-semibold text-purple-900 mb-2">
                              How Your Score Was Calculated
                            </h4>
                            <div className="space-y-1 text-sm text-purple-800">
                              <p>• Comprehension: {session.phaseScores?.comprehension?.toFixed(1)}% × 25% weight</p>
                              <p>• Writing: {session.phaseScores?.writing?.toFixed(1)}% × 30% weight</p>
                              <p>• Conversation: {session.phaseScores?.conversation?.toFixed(1)}% × 45% weight</p>
                              <p className="font-semibold mt-2">
                                = Final Score: {session.score?.toFixed(1)}%
                              </p>
                            </div>
                            <p className="text-xs text-purple-700 mt-3">
                              Conversation is weighted most heavily (45%) because fluency and interaction 
                              are the strongest indicators of practical proficiency.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              
              {formattedFeedback.length > 0 && (
                <>
                  <Separator className="my-8" />
                  
                  <h3 className="text-xl font-bold mb-4">{t.results.recommendations}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {formattedFeedback.slice(0, 4).map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-palavox-purple mb-2">{item.title}</h4>
                        <p className="text-sm whitespace-pre-line">{item.content}</p>
                      </div>
                    ))}
                  </div>
                  
                  {formattedFeedback.length > 4 && (
                    <p className="text-sm text-gray-600 mt-4 text-center">
                      {t.results.downloadFullReport}
                    </p>
                  )}
                </>
              )}
              
              <Separator className="my-8" />
              
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <Button asChild variant="outline">
                    <Link to="/">
                      {t.results.returnToHome}
                    </Link>
                  </Button>
                  {user && (
                    <Button asChild variant="outline">
                      <Link to="/test-history">
                        {t.results.viewTestHistory}
                      </Link>
                    </Button>
                  )}
                </div>
                <Button asChild>
                  <Link to="/test">
                    {t.results.takeAnotherTest}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Enhanced Scoring Debug Panel - Only show for tests with questions */}
          {!isSinglePhase && session.testType === TestType.MultipleChoice && (
            <ScoringDebugPanel 
              sessionId={session.id} 
              onReportIssue={handleReportIssue}
            />
          )}
          
          {/* Grading Rubric */}
          <GradingRubric phase={isSinglePhase ? (session as any).singlePhase : session.testType} />
          
          <div className="text-center mt-12">
            <p className="text-sm text-palavox-slate">
              {t.results.palavoxAssessments}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
