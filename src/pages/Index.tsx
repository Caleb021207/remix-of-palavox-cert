
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GraduationCap, FileText, User, Shield, Lock, Eye, FileCheck, Users, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Navbar from '@/components/Navbar';
import { useUILanguage } from '@/contexts/UILanguageContext';

const Index = () => {
  const { t } = useUILanguage();

  return (
    <div className="flex flex-col min-h-screen bg-palavox-ivory">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-palavox-lavender to-palavox-ivory">
          <div className="container-custom text-center">
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-center mb-6">
                <img 
                  src="/lovable-uploads/04f7d515-eab6-4ff2-9d1a-ab5f25acb52b.png" 
                  alt="Palavox Cert Logo" 
                  className="h-40 md:h-48"
                />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                {t?.home?.title || 'Palavox Cert'}
              </h1>
              <p className="text-xl md:text-2xl text-palavox-slate mb-10">
                {t?.home?.subtitle || 'English Language Proficiency Certification'}
              </p>
              <Link to="/test">
                <Button className="btn-primary text-lg">
                  {t?.home?.startTest || 'Start Test'}
                </Button>
              </Link>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16">
          <div className="container-custom">
            <h2 className="text-3xl font-bold text-center mb-12">{t?.home?.featuresTitle || 'Certification Features'}</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6 border-t-4 border-t-palavox-purple">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-palavox-lavender flex items-center justify-center mb-4">
                    <GraduationCap className="h-6 w-6 text-palavox-purple" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t?.home?.speakingAssessment?.title || 'Speaking Assessment'}</h3>
                  <p className="text-palavox-slate">
                    {t?.home?.speakingAssessment?.description || 'Interactive AI-powered conversation tests to evaluate your speaking proficiency.'}
                  </p>
                </div>
              </Card>
              
              <Card className="p-6 border-t-4 border-t-palavox-purple">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-palavox-lavender flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-palavox-purple" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t?.home?.multipleChoice?.title || 'Multiple Choice'}</h3>
                  <p className="text-palavox-slate">
                    {t?.home?.multipleChoice?.description || 'Comprehensive language knowledge assessment across ACTFL levels.'}
                  </p>
                </div>
              </Card>
              
              <Card className="p-6 border-t-4 border-t-palavox-purple">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-palavox-lavender flex items-center justify-center mb-4">
                    <User className="h-6 w-6 text-palavox-purple" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t?.home?.writingExam?.title || 'Writing Exam'}</h3>
                  <p className="text-palavox-slate">
                    {t?.home?.writingExam?.description || 'Express yourself through writing prompts tailored to your proficiency level.'}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Important Notice Section */}
        <section className="py-12 bg-blue-50">
          <div className="container-custom">
            <Card className="max-w-3xl mx-auto border-l-4 border-l-blue-600">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-blue-900 mb-3">
                      Important: Assessment Information
                    </h3>
                    <div className="space-y-3 text-gray-700">
                      <p>
                        <strong>Purpose:</strong> Palavox Cert assessments are designed for <strong>self-assessment, progress tracking, and placement guidance</strong>. While we use AI-powered testing for accurate evaluation, results may contain inaccuracies and should be used as guidance rather than definitive measures.
                      </p>
                      <p>
                        <strong>Certification Status:</strong> Palavox Cert does not issue official, accredited language certifications. The proficiency levels indicated in your results represent our assessment of your capabilities. We believe that with the same level of honest effort and performance, you would be capable of achieving similar results on accredited examinations (such as ACTFL, CEFR-aligned tests, or similar official assessments).
                      </p>
                      <p className="text-sm text-gray-600">
                        For official certification purposes (immigration, academic credit, professional licensing), please consult accredited testing organizations.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-palavox-purple text-palavox-ivory">
          <div className="container-custom text-center">
            <h2 className="text-3xl font-bold mb-6">{t?.home?.ctaTitle || 'Ready to Assess Your Skills?'}</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              {t?.home?.ctaDescription || 'Get insights into your language proficiency and track your progress over time.'}
            </p>
            <Link to="/test">
              <Button className="bg-palavox-gold text-palavox-charcoal hover:bg-amber-400 text-lg">
                {t?.home?.takeTestNow || 'Take Test Now'}
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <footer className="bg-palavox-charcoal text-palavox-ivory py-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src="/lovable-uploads/04f7d515-eab6-4ff2-9d1a-ab5f25acb52b.png" 
                alt="Palavox Cert Logo" 
                className="h-10 mr-2"
              />
              <span className="font-serif text-lg">{t?.home?.title || 'Palavox Cert'}</span>
            </div>
            <div className="text-sm text-palavox-ivory/70">
              &copy; {new Date().getFullYear()} {t?.home?.title || 'Palavox Cert'}. {t?.home?.footer?.copyright || 'All rights reserved.'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
