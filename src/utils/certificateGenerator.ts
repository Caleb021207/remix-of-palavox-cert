import QRCode from 'qrcode';
import type { ServerCertificate } from '@/services/test/secureTestService';

const DISCLAIMER_LINES = [
  'This is not an accredited language certification. Palavox Cert is an AI-assisted assessment',
  'intended for placement, progress tracking and self-assessment. It does not replace ACTFL,',
  'CEFR or other accredited examinations administered by recognised awarding bodies.',
];

/**
 * Renders a certificate from the SERVER-ISSUED certificate record only.
 * Nothing on this canvas is computed in the browser: the holder name, level
 * and verification code all come from the database row written by the
 * `issue-certificate` edge function, and the QR code points at the public
 * verification page so a school can confirm the certificate is genuine.
 */
export const generateCertificate = async (
  certificate: ServerCertificate,
  options?: { phase?: string; verifyBaseUrl?: string }
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = 1123;
  canvas.height = 794;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const issued = new Date(certificate.issued_at);
  const formattedDate = issued.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const holderName = certificate.holder_name?.trim() || 'Name not on file';
  const assessmentName = options?.phase
    ? getPhaseName(options.phase)
    : 'English Language Proficiency Assessment';

  const base = options?.verifyBaseUrl ?? window.location.origin;
  const verifyUrl = `${base}/verify?id=${encodeURIComponent(certificate.id)}`;

  // Border
  ctx.strokeStyle = '#4b3f72';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Header
  ctx.fillStyle = '#4b3f72';
  ctx.fillRect(20, 20, canvas.width - 40, 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PALAVOX PROFICIENCY ASSESSMENT', canvas.width / 2, 60);

  ctx.fillStyle = '#4b3f72';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText('Statement of Assessed Proficiency', canvas.width / 2, 150);

  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('This records that', canvas.width / 2, 200);

  // Real holder name from the server record
  ctx.font = 'italic 28px Arial, sans-serif';
  ctx.fillText(holderName, canvas.width / 2, 240);

  ctx.strokeStyle = '#4b3f72';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 180, 250);
  ctx.lineTo(canvas.width / 2 + 180, 250);
  ctx.stroke();

  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('completed the', canvas.width / 2, 290);

  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText(assessmentName, canvas.width / 2, 330);

  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('and demonstrated an assessed proficiency level of', canvas.width / 2, 370);

  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(certificate.cefr_level, canvas.width / 2, 412);

  if (certificate.functional_label) {
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText(certificate.functional_label, canvas.width / 2, 440);
  }

  ctx.font = '16px Arial, sans-serif';
  ctx.fillText(`Issued on ${formattedDate}`, canvas.width / 2, 478);
  ctx.fillText(`Verification code: ${certificate.verification_code}`, canvas.width / 2, 502);

  // Non-accreditation disclaimer, printed on the certificate itself
  ctx.fillStyle = '#555555';
  ctx.font = '13px Arial, sans-serif';
  DISCLAIMER_LINES.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, 660 + i * 20);
  });

  // Real QR code linking to the public verification page
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 220 });
    const img = await loadImage(qrDataUrl);
    ctx.drawImage(img, canvas.width - 180, 540, 110, 110);
    ctx.fillStyle = '#4b3f72';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText('Scan to verify', canvas.width - 125, 666);
  } catch (err) {
    console.warn('Could not render verification QR code:', err);
    ctx.fillStyle = '#4b3f72';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Verify at ${verifyUrl}`, canvas.width - 60, 620);
    ctx.textAlign = 'center';
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render certificate'))), 'image/png', 1.0);
  });
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getPhaseName(phase: string): string {
  switch (phase.toLowerCase()) {
    case 'reading':
      return 'Reading Comprehension Assessment';
    case 'listening':
      return 'Listening Comprehension Assessment';
    case 'comprehension':
      return 'Reading & Listening Comprehension Assessment';
    case 'writing':
      return 'Writing Proficiency Assessment';
    case 'speaking':
      return 'Speaking Proficiency Assessment';
    case 'conversation':
    case 'conversational-fluency':
      return 'Conversational Fluency Assessment';
    default:
      return 'Language Proficiency Assessment';
  }
}
