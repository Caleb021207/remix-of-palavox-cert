import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Headphones, PenTool, Mic, Volume2, Award } from 'lucide-react';
import { TestPhase } from '@/types';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface PhaseSelectionMenuProps {
  onSelectPhase: (phase: TestPhase | 'full') => void;
  loading?: boolean;
}

const PhaseSelectionMenu: React.FC<PhaseSelectionMenuProps> = ({ 
  onSelectPhase, 
  loading = false 
}) => {
  const { t } = useUILanguage();

  const phases = [
    {
      id: TestPhase.Comprehension,
      title: t.test.phaseSelection.phases.comprehension?.title || 'Comprensión',
      description: t.test.phaseSelection.phases.comprehension?.description || 'Evalúa lectura y audición',
      icon: BookOpen,
      duration: t.test.phaseSelection.phases.comprehension?.duration || '15-20 min',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'hover:border-blue-600'
    },
    {
      id: TestPhase.Writing,
      title: t.test.phaseSelection.phases.writing.title,
      description: t.test.phaseSelection.phases.writing.description,
      icon: PenTool,
      duration: t.test.phaseSelection.phases.writing.duration,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'hover:border-purple-600'
    },
    {
      id: TestPhase.Conversation,
      title: t.test.phaseSelection.phases['conversational-fluency']?.title || 'Fluidez Conversacional',
      description: t.test.phaseSelection.phases['conversational-fluency']?.description || 'Conversación con IA',
      icon: Volume2,
      duration: '10 min',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'hover:border-pink-600'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-primary">
          {t.test.phaseSelection.title}
        </h2>
        <p className="text-muted-foreground">
          {t.test.phaseSelection.subtitle}
        </p>
      </div>

      {/* Full Certification Test - Prominent Card */}
      <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">{t.test.phaseSelection.fullCertification.title}</CardTitle>
              <CardDescription className="text-base">
                {t.test.phaseSelection.fullCertification.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => onSelectPhase('full')} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                {t.test.phaseSelection.loading}
              </>
            ) : (
              <>
                <Award className="h-5 w-5 mr-2" />
                {t.test.phaseSelection.fullCertification.button}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-4 text-muted-foreground">
            {t.test.phaseSelection.divider}
          </span>
        </div>
      </div>

      {/* Individual Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {phases.map((phase) => {
          const Icon = phase.icon;
          return (
            <Card 
              key={phase.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${phase.borderColor}`}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${phase.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`h-6 w-6 ${phase.color}`} />
                </div>
                <CardTitle className="text-lg">{phase.title}</CardTitle>
                <CardDescription className="text-sm">
                  {phase.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t.test.phaseSelection.durationLabel}</span>
                  <span className="font-medium">{phase.duration}</span>
                </div>
                <Button 
                  onClick={() => onSelectPhase(phase.id)} 
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {t.test.phaseSelection.phases[phase.id.toLowerCase() as keyof typeof t.test.phaseSelection.phases].button}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseSelectionMenu;
