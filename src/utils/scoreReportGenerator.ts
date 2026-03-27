import { TestSession, TestType, CEFRLevel, ACTFLLevel, TestPhase } from '@/types';
import { languages } from '@/config/languages';
import { determineSTAMPLevel } from './stampScoring';
import { CERTIFICATE_TIERS, checkCertificateEligibility } from '@/config/testConfig';

export const generateScoreReport = async (session: TestSession): Promise<Blob> => {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set canvas size (A4 proportions in pixels, taller for rubric details)
  canvas.width = 794;  // A4 width in pixels at 96 DPI
  canvas.height = 1400; // Increased height for STAMP rubric details
  
  // Set background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const testDate = session.endTime ? new Date(session.endTime) : new Date();
  const formattedDate = testDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });

  // Get language information
  const languageCode = session.language || 'spanish';
  const languageConfig = languages[languageCode as keyof typeof languages];
  const targetLanguage = languageConfig?.targetLanguage || 'Spanish';

  // Render the report
  renderReportContent(ctx, session, formattedDate, targetLanguage);
  
  // Convert canvas to blob - properly handle the async operation
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate image blob'));
      }
    }, 'image/png', 1.0);
  });
};

function renderReportContent(ctx: CanvasRenderingContext2D, session: TestSession, formattedDate: string, targetLanguage: string) {
  // Header background
  ctx.fillStyle = '#4b3f72'; // Palavox purple
  ctx.fillRect(0, 0, 794, 80);
  
  // Header text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PALAVOX LANGUAGE ASSESSMENT', 397, 35);
  
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('Comprehensive Score Report', 397, 60);
  
  // Report Title
  ctx.fillStyle = '#4b3f72';
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.fillText('Language Proficiency Report', 397, 130);
  
  // Language and Test Info
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(`${targetLanguage} Assessment`, 397, 170);
  
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText(`Test Type: ${getTestTypeName(session.testType)}`, 397, 200);
  ctx.fillText(`Date: ${formattedDate}`, 397, 225);
  ctx.fillText(`Session ID: ${session.id}`, 397, 250);
  
  // Overall Score Circle
  const centerX = 397;
  const centerY = 320;
  const radius = 60;
  
  // Circle background
  ctx.strokeStyle = '#4b3f72';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Score text
  ctx.fillStyle = '#4b3f72';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${(session.score || 0).toFixed(1)}%`, centerX, centerY - 5);
  
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Overall Score', centerX, centerY + 25);
  
  // CEFR and ACTFL Levels
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText(`CEFR Level: ${session.cefr || 'N/A'}`, 397, 420);
  ctx.fillText(`ACTFL Level: ${session.actfl || 'N/A'}`, 397, 450);
  
  // Certificate Achievement Section (if multi-phase)
  let eligibility: ReturnType<typeof checkCertificateEligibility> | null = null;
  let badgeYPos = 480;
  
  if (session.phaseScores && session.phaseScores.comprehension !== undefined) {
    eligibility = checkCertificateEligibility({
      comprehension: session.phaseScores[TestPhase.Comprehension],
      writing: session.phaseScores[TestPhase.Writing],
      conversation: session.phaseScores[TestPhase.Conversation]
    });
    
    if (eligibility.qualified) {
      // Certificate Badge
      ctx.fillStyle = '#059669'; // emerald-600
      ctx.fillRect(247, 480, 300, 60);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('🏆 CERTIFICATE EARNED 🏆', 397, 505);
      
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(CERTIFICATE_TIERS[eligibility.tier].name, 397, 530);
      
      badgeYPos = 560; // Move language badge down
    }
  }
  
  // Language badge
  ctx.fillStyle = '#f0f0ff';
  ctx.fillRect(297, badgeYPos, 200, 40);
  ctx.strokeStyle = '#4b3f72';
  ctx.lineWidth = 2;
  ctx.strokeRect(297, badgeYPos, 200, 40);
  
  ctx.fillStyle = '#4b3f72';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText(`Language: ${targetLanguage}`, 397, badgeYPos + 25);
  
  // Section Performance with STAMP Rubric
  const sections = getSectionScores(session);
  let yPos = badgeYPos + 60; // Start after language badge
  
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillStyle = '#4b3f72';
  ctx.fillText('Section Performance & STAMP Rubric:', 50, yPos);
  
  yPos += 40;
  sections.forEach((section, index) => {
    const stampLevel = determineSTAMPLevel(section.score);
    
    // Section Header with Score
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#4b3f72';
    ctx.fillText(section.name, 50, yPos);
    
    // Score badge
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(`${section.score.toFixed(1)}% - ${stampLevel.cefrLevel} (${stampLevel.actflLevel})`, 50, yPos + 20);
    
    // STAMP Level
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText(`STAMP Level ${stampLevel.level}: ${stampLevel.name} - ${stampLevel.textType}`, 50, yPos + 40);
    
    yPos += 55;
    
    // Only add detailed rubric for first 2 sections to save space
    if (index < 2) {
      // Rubric Details (wrap text)
      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = '#333333';
      
      const maxWidth = 680;
      const lineHeight = 14;
      
      // Language Control
      const lcLines = wrapText(ctx, `• Language: ${stampLevel.languageControl}`, maxWidth);
      lcLines.forEach(line => {
        ctx.fillText(line, 60, yPos);
        yPos += lineHeight;
      });
      
      yPos += 5;
      
      // Vocabulary
      const vocabLines = wrapText(ctx, `• Vocabulary: ${stampLevel.vocabulary}`, maxWidth);
      vocabLines.forEach(line => {
        ctx.fillText(line, 60, yPos);
        yPos += lineHeight;
      });
      
      yPos += 5;
      
      // Accuracy
      const accLines = wrapText(ctx, `• Accuracy: ${stampLevel.accuracy}`, maxWidth);
      accLines.forEach(line => {
        ctx.fillText(line, 60, yPos);
        yPos += lineHeight;
      });
      
      yPos += 20;
    } else {
      yPos += 10;
    }
  });
  
  // QR Code placeholder (positioned above footer)
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.strokeRect(650, 480, 80, 80);
  
  ctx.fillStyle = '#666666';
  ctx.font = '10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scan to upload to', 690, 575);
  ctx.fillText('Palavox.world for', 690, 590);
  ctx.fillText('personalized tutoring', 690, 605);
  
  // Footer
  ctx.fillStyle = '#4b3f72';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('For detailed analysis and personalized tutoring, upload this report to Palavox.world', 397, 1360);
}

function getSectionScores(session: TestSession) {
  const sections = [];
  
  // For multi-phase tests, extract section scores
  if (session.phaseScores) {
    const phaseScores = session.phaseScores as any;
    
    // New 3-phase structure
    if (phaseScores.comprehension !== undefined && phaseScores.comprehension > 0) {
      sections.push({
        name: 'Comprensión (Reading + Listening)',
        score: phaseScores.comprehension,
        feedback: session.feedback?.comprehension
      });
    }
    if (phaseScores.writing !== undefined && phaseScores.writing > 0) {
      sections.push({
        name: 'Producción Escrita',
        score: phaseScores.writing,
        feedback: session.feedback?.writing
      });
    }
    if (phaseScores.conversation !== undefined && phaseScores.conversation > 0) {
      sections.push({
        name: 'Fluidez Conversacional',
        score: phaseScores.conversation,
        feedback: session.feedback?.conversation
      });
    }
    
    // Legacy support for old phase structure
    if (phaseScores.reading !== undefined && phaseScores.reading > 0 && !phaseScores.comprehension) {
      sections.push({
        name: 'Reading Comprehension',
        score: phaseScores.reading,
        feedback: session.feedback?.reading
      });
    }
    if (phaseScores.listening !== undefined && phaseScores.listening > 0 && !phaseScores.comprehension) {
      sections.push({
        name: 'Listening Comprehension',
        score: phaseScores.listening,
        feedback: session.feedback?.listening
      });
    }
    if (phaseScores.speaking !== undefined && phaseScores.speaking > 0 && !phaseScores.conversationalfluency) {
      sections.push({
        name: 'Oral Communication',
        score: phaseScores.speaking,
        feedback: session.feedback?.speaking
      });
    }
    if (phaseScores.pronunciation !== undefined && phaseScores.pronunciation > 0) {
      sections.push({
        name: 'Pronunciation',
        score: phaseScores.pronunciation,
        feedback: session.feedback?.pronunciation
      });
    }
  } else {
    // For single-test types, show overall performance
    sections.push({
      name: getTestTypeName(session.testType),
      score: session.score || 0,
      feedback: session.feedback?.summary
    });
  }
  
  return sections;
}

function getTestTypeName(testType: TestType): string {
  switch (testType) {
    case TestType.Speaking:
      return 'Speaking Assessment';
    case TestType.Writing:
      return 'Writing Assessment';
    case TestType.MultipleChoice:
      return 'Language Knowledge Test';
    default:
      return 'Language Assessment';
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
