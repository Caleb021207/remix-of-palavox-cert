/**
 * Generate a stable hash from content for duplicate detection
 * Uses SHA-256 to create a consistent identifier
 */
export async function generateStemHash(content: any): Promise<string> {
  // Extract key fields that define uniqueness
  const canonical = JSON.stringify({
    text: content.passage || content.text || content.prompt,
    questions: content.questions?.map((q: any) => ({
      text: q.text,
      correctAnswer: q.correctAnswer || q.correct_answer
    }))
  });

  // Use Web Crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Browser-compatible version for client-side use
 */
export function generateStemHashSync(content: any): string {
  const canonical = JSON.stringify({
    text: content.passage || content.text || content.prompt,
    questions: content.questions?.map((q: any) => ({
      text: q.text,
      correctAnswer: q.correctAnswer || q.correct_answer
    }))
  });
  
  // Simple hash for synchronous use (not cryptographic but good enough for deduplication)
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const char = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
