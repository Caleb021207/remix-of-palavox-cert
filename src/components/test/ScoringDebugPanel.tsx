
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, Bug, FileText, Eye } from 'lucide-react';
import { ScoringDebugger } from '@/utils/enhancedScoring';

interface ScoringDebugPanelProps {
  sessionId?: string;
  onReportIssue?: () => void;
}

const ScoringDebugPanel: React.FC<ScoringDebugPanelProps> = ({ sessionId, onReportIssue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [debugReport, setDebugReport] = useState<string>('');
  const [userReport, setUserReport] = useState<string>('');
  const [validationSummary, setValidationSummary] = useState<any>(null);

  React.useEffect(() => {
    // Load debug report from localStorage
    const report = localStorage.getItem('scoringDebugReport');
    if (report) {
      setDebugReport(report);
    }
    
    // Generate user-friendly report
    const userFriendlyReport = ScoringDebugger.generateUserFriendlyReport(sessionId);
    setUserReport(userFriendlyReport);
    
    // Get validation summary
    const summary = ScoringDebugger.getValidationSummary(sessionId);
    setValidationSummary(summary);
  }, [sessionId]);

  const handleCopyReport = () => {
    const fullReport = `TECHNICAL DEBUG REPORT:\n${debugReport}\n\nUSER REPORT:\n${userReport}`;
    navigator.clipboard.writeText(fullReport);
    // Could add a toast notification here
  };

  const handleCopyValidation = () => {
    const validationData = localStorage.getItem('scoringValidation');
    if (validationData) {
      navigator.clipboard.writeText(validationData);
    }
  };

  if (!debugReport && !userReport) {
    return null;
  }

  const hasIssues = validationSummary?.lowConfidenceAnswers > 0 || 
                   (validationSummary?.methodBreakdown?.['no-match']?.count > 0) ||
                   (validationSummary?.methodBreakdown?.['text-mismatch']?.count > 0);

  return (
    <Card className={`mt-6 ${hasIssues ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${hasIssues ? 'text-orange-800' : 'text-blue-800'}`}>
          {hasIssues ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          Scoring Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {validationSummary && (
            <div className={`p-3 rounded-lg ${hasIssues ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <h4 className="font-medium mb-2">Scoring Summary:</h4>
              <div className="text-sm space-y-1">
                <p>• {validationSummary.correctAnswers}/{validationSummary.totalQuestions} questions correct</p>
                {validationSummary.lowConfidenceAnswers > 0 && (
                  <p className="text-orange-700">• {validationSummary.lowConfidenceAnswers} answers with low confidence scoring</p>
                )}
                <p>• Methods used: {Object.keys(validationSummary.methodBreakdown).join(', ')}</p>
              </div>
            </div>
          )}
          
          <p className={`text-sm ${hasIssues ? 'text-orange-700' : 'text-blue-700'}`}>
            {hasIssues 
              ? 'Some questions may have had scoring difficulties. Review the details below or report an issue if you believe your score is incorrect.'
              : 'Your test was scored successfully using our enhanced scoring system. All answers were evaluated with high confidence.'
            }
          </p>
          
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Detailed Scoring Analysis
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border max-h-96 overflow-y-auto">
                  <h5 className="font-medium mb-2">Scoring Breakdown:</h5>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
                    {userReport}
                  </pre>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  >
                    <Bug className="h-4 w-4 mr-1" />
                    {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
                  </Button>
                </div>
                
                {showTechnicalDetails && (
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h5 className="font-medium mb-2">Technical Debug Information:</h5>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-gray-600 max-h-64 overflow-y-auto">
                      {debugReport}
                    </pre>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyReport}>
                    <FileText className="h-4 w-4 mr-1" />
                    Copy Analysis
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyValidation}>
                    Copy Validation Data
                  </Button>
                  {onReportIssue && (
                    <Button variant="outline" size="sm" onClick={onReportIssue}>
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Report Scoring Issue
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoringDebugPanel;
