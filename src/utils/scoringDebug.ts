
export interface ScoringDebugInfo {
  questionId: string;
  questionText: string;
  questionType: string;
  userAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  comparisonMethod: string;
  confidence?: number;
  debugInfo?: any;
  timestamp: string;
  sessionId?: string;
}

export class ScoringDebugger {
  private static logs: ScoringDebugInfo[] = [];

  static logAnswerEvaluation(info: ScoringDebugInfo) {
    console.log('🔍 Answer Evaluation:', {
      question: info.questionText.substring(0, 100) + '...',
      type: info.questionType,
      userAnswer: info.userAnswer,
      correctAnswer: info.correctAnswer,
      result: info.isCorrect ? '✅ CORRECT' : '❌ INCORRECT',
      method: info.comparisonMethod,
      confidence: info.confidence
    });
    
    if (info.debugInfo) {
      console.log('🔧 Debug Details:', info.debugInfo);
    }
    
    this.logs.push(info);
  }

  static getSessionLogs(sessionId?: string): ScoringDebugInfo[] {
    if (!sessionId) return this.logs;
    return this.logs.filter(log => log.sessionId === sessionId);
  }

  static generateReport(sessionId?: string): string {
    const logs = this.getSessionLogs(sessionId);
    const correct = logs.filter(log => log.isCorrect).length;
    const total = logs.length;
    
    let report = `📊 Enhanced Scoring Report\n`;
    report += `Score: ${correct}/${total} (${((correct/total) * 100).toFixed(1)}%)\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Method breakdown
    const methodCounts: Record<string, number> = {};
    logs.forEach(log => {
      methodCounts[log.comparisonMethod] = (methodCounts[log.comparisonMethod] || 0) + 1;
    });
    
    report += `📈 Scoring Methods Used:\n`;
    Object.entries(methodCounts).forEach(([method, count]) => {
      report += `  ${method}: ${count} questions\n`;
    });
    report += '\n';
    
    logs.forEach((log, index) => {
      report += `${index + 1}. ${log.isCorrect ? '✅' : '❌'} ${log.questionText.substring(0, 50)}...\n`;
      report += `   Method: ${log.comparisonMethod}`;
      if (log.confidence) {
        report += ` (${(log.confidence * 100).toFixed(0)}% confidence)`;
      }
      report += '\n';
      
      if (!log.isCorrect) {
        report += `   Expected: ${JSON.stringify(log.correctAnswer)}\n`;
        report += `   Got: ${JSON.stringify(log.userAnswer)}\n`;
      }
      
      if (log.debugInfo && log.debugInfo.attempts) {
        report += `   Attempts: ${log.debugInfo.attempts.length}\n`;
      }
      report += '\n';
    });
    
    return report;
  }

  static generateUserFriendlyReport(sessionId?: string): string {
    const logs = this.getSessionLogs(sessionId);
    const correct = logs.filter(log => log.isCorrect).length;
    const total = logs.length;
    
    let report = `Your test was scored using our enhanced scoring system.\n\n`;
    report += `Overall Result: ${correct} out of ${total} questions correct (${((correct/total) * 100).toFixed(1)}%)\n\n`;
    
    // Show questions that had scoring issues
    const problematicQuestions = logs.filter(log => 
      log.comparisonMethod === 'no-match' || 
      log.comparisonMethod === 'text-mismatch' ||
      (log.confidence && log.confidence < 0.8)
    );
    
    if (problematicQuestions.length > 0) {
      report += `⚠️ Questions with potential scoring concerns:\n`;
      problematicQuestions.forEach((log, index) => {
        report += `${index + 1}. Question: "${log.questionText.substring(0, 60)}..."\n`;
        report += `   Your answer: ${JSON.stringify(log.userAnswer)}\n`;
        report += `   Scoring method: ${log.comparisonMethod}\n`;
        if (log.confidence) {
          report += `   Confidence: ${(log.confidence * 100).toFixed(0)}%\n`;
        }
        report += '\n';
      });
    }
    
    return report;
  }

  static clearLogs() {
    this.logs = [];
  }

  static getValidationSummary(sessionId?: string): any {
    const logs = this.getSessionLogs(sessionId);
    const methodStats: Record<string, { count: number; correct: number }> = {};
    
    logs.forEach(log => {
      if (!methodStats[log.comparisonMethod]) {
        methodStats[log.comparisonMethod] = { count: 0, correct: 0 };
      }
      methodStats[log.comparisonMethod].count++;
      if (log.isCorrect) {
        methodStats[log.comparisonMethod].correct++;
      }
    });
    
    return {
      totalQuestions: logs.length,
      correctAnswers: logs.filter(log => log.isCorrect).length,
      methodBreakdown: methodStats,
      lowConfidenceAnswers: logs.filter(log => log.confidence && log.confidence < 0.8).length,
      timestamp: new Date().toISOString()
    };
  }
}
