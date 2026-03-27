
import { TestSession, TestType } from '@/types';
import { getCertificateTitle } from './scoring';

export const generateCertificate = (session: TestSession, phase?: string): Blob => {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set canvas size (A4 landscape proportions in pixels)
  canvas.width = 1123; // A4 landscape width in pixels at 96 DPI
  canvas.height = 794;  // A4 landscape height in pixels at 96 DPI
  
  // Set background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Certificate details
  const testDate = session.endTime ? new Date(session.endTime) : new Date();
  const formattedDate = testDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  
  // Certificate title based on CEFR level
  const certificateTitle = getCertificateTitle(session.cefr!);
  
  // Test type name - handle individual phases
  const testTypeName = phase ? getPhaseName(phase) : getTestTypeName(session.testType);

  // Draw border
  ctx.strokeStyle = '#4b3f72';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  
  // Header background
  ctx.fillStyle = '#4b3f72';
  ctx.fillRect(20, 20, canvas.width - 40, 60);
  
  // Header text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PALAVOX LANGUAGE CERTIFICATION', canvas.width / 2, 60);
  
  // Certificate body
  ctx.fillStyle = '#4b3f72';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText('Certificate of Achievement', canvas.width / 2, 150);
  
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('This certifies that', canvas.width / 2, 200);
  
  // Name placeholder
  ctx.font = 'italic 28px Arial, sans-serif';
  ctx.fillText('Language Learner', canvas.width / 2, 240);
  
  // Underline for name
  ctx.strokeStyle = '#4b3f72';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 150, 250);
  ctx.lineTo(canvas.width / 2 + 150, 250);
  ctx.stroke();
  
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('has successfully completed the', canvas.width / 2, 290);
  
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText(testTypeName, canvas.width / 2, 330);
  
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('and demonstrated language proficiency at the level of', canvas.width / 2, 370);
  
  // Display ACTFL level (primary) with CEFR equivalent
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(`${session.actfl || 'N/A'} (ACTFL)`, canvas.width / 2, 410);
  
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText(`CEFR Equivalent: ${session.cefr || 'N/A'}`, canvas.width / 2, 440);
  
  // Footer with date
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText(`Issued on ${formattedDate}`, canvas.width / 2, 480);
  ctx.fillText('Palavox Certification System', canvas.width / 2, 510);

  // Digital signature area
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(150, 550);
  ctx.lineTo(300, 550);
  ctx.stroke();
  
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Digital Signature', 225, 570);
  
  // QR code placeholder
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width - 120, 500, 60, 60);
  
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText('Scan to verify', canvas.width - 90, 580);

  // Convert canvas to blob
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png', 1.0);
  }) as any;
};

// Helper function to get test type name
function getTestTypeName(testType: TestType): string {
  switch (testType) {
    case TestType.Speaking:
      return 'Speaking Proficiency Test';
    case TestType.Writing:
      return 'Writing Proficiency Test';
    case TestType.MultipleChoice:
      return 'Language Knowledge Test';
    default:
      return 'Language Proficiency Test';
  }
}

// Helper function to get phase name for certificates
function getPhaseName(phase: string): string {
  switch (phase.toLowerCase()) {
    case 'reading':
      return 'Reading Comprehension Assessment';
    case 'listening':
      return 'Listening Comprehension Assessment';
    case 'writing':
      return 'Writing Proficiency Assessment';
    case 'speaking':
      return 'Speaking Proficiency Assessment';
    case 'conversational-fluency':
      return 'Conversational Fluency Assessment';
    default:
      return 'Language Assessment';
  }
}
