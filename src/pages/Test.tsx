import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import MultiPhaseTest from '@/components/test/MultiPhaseTest';
import SinglePhaseTest from '@/components/test/SinglePhaseTest';
import TestSelection from '@/components/test/TestSelection';
import NativeLanguageSelector from '@/components/test/NativeLanguageSelector';
import PhaseSelectionMenu from '@/components/test/PhaseSelectionMenu';
import PaymentModal from '@/components/PaymentModal';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import { TestType, TestSession, TestPhase } from '@/types';
import { LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { startSession } from '@/services/test/secureTestService';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useProgressWarning } from '@/hooks/useProgressWarning';
import { useAuth } from '@/hooks/useAuth';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { translations } from '@/translations';

const Test = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { setLanguage: setUILanguage } = useUILanguage();
  const [testStarted, setTestStarted] = useState(false);
  const [session, setSession] = useState<TestSession | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [languageSelected, setLanguageSelected] = useState(false);
  const [singlePhase, setSinglePhase] = useState<TestPhase | null>(null);
  const [showPhaseSelection, setShowPhaseSelection] = useState(false);
  
  const { paymentVerified, verifyPayment, checkSubscription, setPaymentVerified } = usePaymentVerification();
  
  // Enable progress warning when test is active
  useProgressWarning(testStarted && !!session);

  // Check for payment success on page load
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! You can now start your test.');
      setPaymentVerified(true);
      // Clean up URL
      setSearchParams(new URLSearchParams());
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment cancelled. Please try again to start your test.');
      // Clean up URL
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams, setPaymentVerified]);

  // Initial subscription check on component mount (only once)
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    
    const checkUserAccess = async () => {
      try {
        const subscribed = await checkSubscription();
        if (mounted) {
          setIsSubscriber(subscribed);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        if (mounted) {
          setIsSubscriber(false);
        }
      }
    };

    checkUserAccess();
    
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    setSelectedLanguage(languageCode);
    setLanguageSelected(true);
  };

  const handleStartTest = async (languageCode?: LanguageCode, englishVariant?: EnglishTestVariant) => {
    if (!user) {
      toast.error('Please sign in to start the test');
      return;
    }

    setCheckingAccess(true);

    try {
      // Set UI language based on the test selection with fallback
      if (englishVariant) {
        // For English tests, set UI to the user's native language if supported
        const uiLanguage = englishVariant.uiLanguage;
        console.log('Requested UI language:', uiLanguage);
        
        // Check if the UI language is supported in our translations
        const supportedLanguages = Object.keys(translations);
        const fallbackLanguage = supportedLanguages.includes(uiLanguage) ? uiLanguage : 'en';
        
        console.log('Setting UI language to:', fallbackLanguage, 'from supported:', supportedLanguages);
        setUILanguage(fallbackLanguage as any);
      }

      // Store language selection for session creation
      if (languageCode) {
        setSelectedLanguage(languageCode);
      }

      // If we already know they're a subscriber, show phase selection
      if (isSubscriber) {
        console.log('User is confirmed Premium subscriber, showing phase selection');
        setShowPhaseSelection(true);
        setTestStarted(true);
        return;
      }

      // Otherwise check their subscription status
      const subscribed = await checkSubscription();
      
      if (subscribed) {
        // Premium user - show phase selection
        setShowPhaseSelection(true);
        setTestStarted(true);
        setIsSubscriber(true);
      } else {
        // Non-premium user - check if they have paid or show payment modal
        if (paymentVerified) {
          setShowPhaseSelection(true);
          setTestStarted(true);
        } else {
          setShowPaymentModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking access:', error);
      toast.error('Error checking access. Please try again.');
    } finally {
      setCheckingAccess(false);
    }
  };

  const handlePhaseSelection = (phase: TestPhase | 'full') => {
    const selected = phase === 'full' ? null : phase;
    setSinglePhase(selected);
    setShowPhaseSelection(false);
    void startTestSession(isSubscriber, selectedLanguage ?? undefined, undefined, selected);
  };

  /**
   * Sessions are created by the `start-session` edge function. The browser
   * cannot insert into test_sessions, so the server-issued id is the only
   * valid session identifier for the rest of the exam.
   */
  const startTestSession = async (subscriptionVerified: boolean, languageCode?: LanguageCode, englishVariant?: EnglishTestVariant, phase?: TestPhase | null) => {
    const sessionLanguage = languageCode || selectedLanguage;

    if (!sessionLanguage) {
      console.error('No language selected for test session');
      return;
    }

    setCheckingAccess(true);
    try {
      const { sessionId } = await startSession({
        testType: 'certification',
        language: sessionLanguage,
        singlePhase: phase ?? null,
      });

      const newSession: TestSession = {
        id: sessionId,
        testType: TestType.Certification,
        answers: {},
        startTime: new Date(),
        subscriptionVerified,
        paymentStatus: subscriptionVerified ? 'subscription' : 'paid',
        language: sessionLanguage as LanguageCode,
        englishVariant: englishVariant
      };

      setSession(newSession);
      setTestStarted(true);
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error starting test session:', error);
      toast.error(error instanceof Error ? error.message : 'Could not start your test. Please try again.');
      setShowPhaseSelection(true);
    } finally {
      setCheckingAccess(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentVerified(true);
    setShowPhaseSelection(true);
    setTestStarted(true);
  };

  // Handler to update subscription status from SubscriptionStatus component
  const handleSubscriptionUpdate = (subscriptionInfo: { subscribed: boolean; subscription_tier?: string }) => {
    const isPremium = subscriptionInfo.subscribed && subscriptionInfo.subscription_tier === 'Premium';
    console.log('Subscription status updated:', { subscribed: subscriptionInfo.subscribed, isPremium });
    setIsSubscriber(isPremium);
  };

  /**
   * The server has already scored and finalized the session by this point.
   * We simply hand the results page the session id to read from.
   */
  const handleTestComplete = async (completedSession: TestSession) => {
    navigate(`/results?session=${completedSession.id}`);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-palavox-ivory">
        <Navbar />
        <main className="flex-grow">
          {!languageSelected ? (
            <div className="container-custom py-10">
              <NativeLanguageSelector onSelectLanguage={handleLanguageSelect} />
            </div>
          ) : !testStarted ? (
            <div className="container-custom py-10">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    {selectedLanguage && (
                      <TestSelection 
                        onSelectTest={(lang, variant) => handleStartTest(lang, variant)} 
                        onSelectRealtimeTest={() => handleStartTest()}
                        loading={checkingAccess}
                        selectedLanguage={selectedLanguage}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <SubscriptionStatus onSubscriptionUpdate={handleSubscriptionUpdate} />
                  </div>
                </div>
              </div>
            </div>
          ) : showPhaseSelection ? (
            <div className="container-custom py-10">
              <PhaseSelectionMenu 
                onSelectPhase={handlePhaseSelection}
                loading={false}
              />
            </div>
          ) : !session ? (
            <div className="container-custom py-16 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-palavox-purple mb-4 mx-auto"></div>
                <h2 className="text-2xl font-bold">Initializing test...</h2>
              </div>
            </div>
          ) : singlePhase ? (
            <div className="container-custom py-10">
              <SinglePhaseTest 
                session={session}
                phase={singlePhase}
                onComplete={(completedSession, score) => {
                  toast.success(`${singlePhase} phase completed with score: ${score}%`);
                  navigate(`/results?session=${completedSession.id}&phase=${singlePhase}`);
                }}
                onBackToMenu={() => {
                  setShowPhaseSelection(true);
                  setSession(null);
                  setSinglePhase(null);
                }}
              />
            </div>
          ) : (
            <div className="container-custom py-10">
              <MultiPhaseTest 
                session={session}
                onComplete={handleTestComplete}
              />
            </div>
          )}
        </main>
      </div>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </ProtectedRoute>
  );
};

export default Test;
