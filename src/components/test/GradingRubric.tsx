import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Ear, Mic, FileText, MessageCircle, Award } from 'lucide-react';
import { STAMP_LEVELS } from '@/utils/stampScoring';

interface GradingRubricProps {
  phase: string;
}

const GradingRubric: React.FC<GradingRubricProps> = ({ phase }) => {
  const getPhaseIcon = () => {
    switch (phase.toLowerCase()) {
      case 'reading':
        return <BookOpen className="h-6 w-6 text-palavox-purple" />;
      case 'listening':
        return <Ear className="h-6 w-6 text-palavox-purple" />;
      case 'speaking':
        return <Mic className="h-6 w-6 text-palavox-purple" />;
      case 'writing':
        return <FileText className="h-6 w-6 text-palavox-purple" />;
      case 'conversationalfluency':
        return <MessageCircle className="h-6 w-6 text-palavox-purple" />;
      default:
        return <BookOpen className="h-6 w-6 text-palavox-purple" />;
    }
  };

  const getPhaseTitle = () => {
    switch (phase.toLowerCase()) {
      case 'reading':
        return 'Reading Assessment Rubric';
      case 'listening':
        return 'Listening Assessment Rubric';
      case 'speaking':
        return 'Speaking Assessment Rubric';
      case 'writing':
        return 'Writing Assessment Rubric';
      case 'conversationalfluency':
        return 'Conversational Fluency Rubric';
      default:
        return 'Assessment Rubric';
    }
  };

  const renderSTAMPLevels = () => {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-palavox-purple/10 to-palavox-lavender/30 p-6 rounded-lg border-2 border-palavox-purple/20">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-8 w-8 text-palavox-purple" />
            <h3 className="text-2xl font-bold text-palavox-purple">ACTFL Proficiency Scale (STAMP)</h3>
          </div>
          <p className="text-palavox-slate mb-2">
            The Standards-based Measurement of Proficiency (STAMP) measures language proficiency aligned with the ACTFL (American Council on the Teaching of Foreign Languages) proficiency guidelines.
          </p>
          <p className="text-sm text-palavox-slate/80">
            Your performance is evaluated across 8 distinct levels, from Novice-Low to Advanced-Mid, with each level defining specific competencies in language control, vocabulary, and accuracy. CEFR equivalents are provided for international comparison.
          </p>
        </div>

        {STAMP_LEVELS.map((level, idx) => (
          <div key={level.level} className="relative">
            {idx > 0 && <Separator className="mb-6" />}
            <div className="bg-white border-2 border-palavox-lavender rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="bg-palavox-purple text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                    {level.level}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-palavox-purple mb-2">{level.name}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      ACTFL: {level.actflLevel}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      Score: {level.scoreRange[0]}-{level.scoreRange[1]}%
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      CEFR Equiv: {level.cefrLevel}
                    </span>
                  </div>
                  <div className="bg-palavox-lavender/40 rounded-lg p-4 mb-3">
                    <p className="text-sm font-semibold text-palavox-purple mb-1">Text Type:</p>
                    <p className="text-palavox-slate">{level.textType}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200">
                  <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Language Control
                  </h5>
                  <p className="text-sm text-blue-800">{level.languageControl}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-200">
                  <h5 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Vocabulary
                  </h5>
                  <p className="text-sm text-green-800">{level.vocabulary}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 border border-purple-200">
                  <h5 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    Accuracy
                  </h5>
                  <p className="text-sm text-purple-800">{level.accuracy}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-palavox-purple to-palavox-purple/80">
        <div className="flex items-center gap-3">
          {getPhaseIcon()}
          <CardTitle className="text-2xl text-white">{getPhaseTitle()}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {renderSTAMPLevels()}

        <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Award className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="font-semibold text-yellow-900 mb-2">How Your Score is Determined</p>
              <p className="text-sm text-yellow-800">
                Your performance across all test sections is evaluated using the STAMP framework aligned with ACTFL proficiency guidelines. Each response is analyzed for language control, vocabulary richness, and accuracy. Your final score places you within one of the 8 proficiency levels based on ACTFL standards, with CEFR equivalents provided for international comparison and recognition.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GradingRubric;