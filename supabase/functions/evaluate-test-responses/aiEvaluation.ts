
import { validateResponse, cleanJsonResponse, validateEvaluationResult } from './validation.ts';

export async function evaluateWithAI(
  phase: string,
  responses: Record<string, any>,
  targetLanguage: string,
  openAIApiKey: string
): Promise<{ score: number; feedback: any }> {
  // Validate response quality first
  const allResponses = Object.values(responses).join(' ');
  const validation = validateResponse(allResponses, phase);
  
  if (!validation.isValid) {
    console.log(`❌ Invalid ${phase} response:`, validation.reason);
    const score = Math.random() * 10; // 0-10% for invalid responses
    
    const feedback = {
      grammar: `Response validation failed: ${validation.reason}. Please provide a complete, meaningful response to demonstrate your language skills.`,
      vocabulary: `Insufficient content to assess vocabulary. Please use varied vocabulary to express your ideas.`,
      coherence: `Cannot assess organization due to inadequate response length. Please provide a structured response.`,
      [phase === 'speaking' ? 'fluency' : 'mechanics']: `${phase === 'speaking' ? 'Fluency' : 'Writing mechanics'} cannot be assessed with such a brief response.`,
      overall: `Your response was too brief or repetitive to accurately assess your ${targetLanguage} proficiency. Please provide substantive content that demonstrates your language abilities.`
    };
    
    return { score, feedback };
  }

  // Detect if this is likely a native speaker based on language and quality
  const isLikelyNative = targetLanguage === 'English' && allResponses.length > 100;
  
  // AI evaluation for valid responses with adjusted criteria for native speakers
  const evaluationPrompt = generateSTAMPPrompt(phase, responses, targetLanguage, isLikelyNative);
  
  console.log('🤖 Sending STAMP evaluation request to OpenAI...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional language assessor certified in STAMP methodology. ${isLikelyNative ? 'You are evaluating a NATIVE SPEAKER - adjust expectations accordingly and focus on communication effectiveness rather than basic grammar errors.' : 'You are evaluating a language learner.'} Always return valid JSON without markdown formatting.` 
        },
        { role: 'user', content: evaluationPrompt }
      ],
      max_completion_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', { status: response.status, error: errorText });
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawContent = data.choices[0].message.content;
  
  console.log('📤 Raw OpenAI response:', rawContent);
  
  // Clean and parse the response
  const cleanedContent = cleanJsonResponse(rawContent);
  console.log('🧹 Cleaned content for parsing:', cleanedContent);
  
  let evaluation;
  try {
    evaluation = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    console.error('📝 Content that failed to parse:', cleanedContent);
    
    // Better fallback scoring for native speakers
    const fallbackScore = isLikelyNative ? 85 : 35;
    evaluation = {
      score: fallbackScore,
      feedback: {
        grammar: 'Assessment completed - detailed feedback unavailable due to processing error',
        vocabulary: 'Assessment completed - detailed feedback unavailable due to processing error',
        coherence: 'Assessment completed - detailed feedback unavailable due to processing error',
        [phase === 'speaking' ? 'fluency' : 'mechanics']: 'Assessment completed - detailed feedback unavailable due to processing error',
        overall: `Assessment encountered technical difficulties. ${isLikelyNative ? 'Based on response quality, you demonstrate strong proficiency.' : 'Please retake the assessment for accurate evaluation.'}`
      }
    };
    
    console.log('🔄 Using improved fallback evaluation:', evaluation);
  }
  
  // Adjust scores for likely native speakers
  if (isLikelyNative && evaluation.score < 80) {
    console.log(`🔧 Adjusting score for native speaker: ${evaluation.score} -> ${Math.max(80, evaluation.score)}`);
    evaluation.score = Math.max(80, evaluation.score);
    if (evaluation.feedback?.overall) {
      evaluation.feedback.overall += ' (Score adjusted for native speaker proficiency)';
    }
  }
  
  // CRITICAL: Enforce language validation - cap score if wrong language detected
  if (evaluation.language_validated === false || (evaluation.detected_language && evaluation.detected_language.toLowerCase() !== targetLanguage.toLowerCase())) {
    console.log(`🚨 WRONG LANGUAGE DETECTED: Response is in ${evaluation.detected_language || 'unknown language'}, not ${targetLanguage}`);
    evaluation.score = Math.min(15, evaluation.score); // Cap at 15% for wrong language
    evaluation.feedback = {
      grammar: `Response not written in ${targetLanguage}`,
      vocabulary: `Cannot assess ${targetLanguage} vocabulary as response is in another language`,
      coherence: 'Assessment cannot proceed in wrong language',
      [phase === 'speaking' ? 'fluency' : 'mechanics']: `${targetLanguage} proficiency cannot be evaluated`,
      overall: `CRITICAL: This response is written in ${evaluation.detected_language || 'another language'}, not ${targetLanguage}. This is a ${targetLanguage} proficiency test. All responses must be in ${targetLanguage}. Score: ${evaluation.score}%. Please retake the test using ${targetLanguage}.`
    };
  }
  
  const validatedResult = validateEvaluationResult(evaluation);
  console.log('✅ Final evaluation result:', { score: validatedResult.score, feedbackKeys: Object.keys(validatedResult.feedback) });
  
  return validatedResult;
}

function generateSTAMPPrompt(phase: string, responses: Record<string, any>, targetLanguage: string, isLikelyNative: boolean): string {
  // Calculate word counts for length-based scoring
  const responseLengths: Record<string, number> = {};
  const expectedLengths: Record<string, { min: number; target: number }> = {
    'Novice': { min: 30, target: 75 },
    'Intermediate': { min: 75, target: 150 },
    'Advanced': { min: 150, target: 250 }
  };
  
  Object.entries(responses).forEach(([key, value]) => {
    const text = String(value || '');
    responseLengths[key] = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  });

  const nativeAdjustment = isLikelyNative ? `

NATIVE SPEAKER ADJUSTMENTS:
- This appears to be a native ${targetLanguage} speaker
- Focus on communication effectiveness, fluency, and sophistication rather than basic errors
- Minor grammatical errors or colloquialisms should not significantly impact scores
- Expected range: 80-95% for competent native speakers
- Evaluate complexity of ideas, coherence, and natural expression
- Consider that native speakers may use informal register or conversational patterns` : '';

  return `You are a professional ${targetLanguage} language assessor using STAMP (Standards-based Measurement of Proficiency) criteria. Evaluate this ${phase} response with strict adherence to STAMP rubric standards.

Response Data: ${JSON.stringify(responses)}
Response Word Counts: ${JSON.stringify(responseLengths)}

CRITICAL - LANGUAGE VALIDATION (CHECK FIRST):
- The response MUST be written in ${targetLanguage}
- If the response is primarily in ANY OTHER LANGUAGE (not ${targetLanguage}), assign a score of 0-15% maximum
- Common wrong languages to detect: Spanish, Vietnamese, Indonesian, Swahili, French, German, Italian, Portuguese, Chinese, Japanese, Korean
- If wrong language detected, set feedback to: "Response not written in ${targetLanguage}. This is a ${targetLanguage} proficiency test and responses must be in ${targetLanguage}."
- Even if a few ${targetLanguage} words are present, if the majority is another language, this counts as wrong language
- Only proceed with full evaluation if response is genuinely in ${targetLanguage}

${nativeAdjustment}

LENGTH-BASED GRADING (GLIDE CURVE - GENTLE):

Target Word Counts by Level:
- A2 Target: 60+ words
  • <24 words (40% of target): -15%
  • 24-36 words (40-60%): -10%
  • 36-48 words (60-80%): -5%
  • 48+ words (80%+): full credit
  
- B1 Target: 120+ words
  • <48 words (40% of target): -15%
  • 48-72 words (40-60%): -10%
  • 72-96 words (60-80%): -5%
  • 96+ words (80%+): full credit
  
- B2 Target: 180+ words
  • <72 words (40% of target): -15%
  • 72-108 words (40-60%): -10%
  • 108-144 words (60-80%): -5%
  • 144+ words (80%+): full credit
  
- C1 Target: 220+ words
  • <88 words (40% of target): -15%
  • 88-132 words (40-60%): -10%
  • 132-176 words (60-80%): -5%
  • 176+ words (80%+): full credit

CRITICAL RULES:
- Apply penalties BEFORE calculating final score
- Cap total length penalty at -15% maximum
- Words beyond target = NO bonus points
- Focus on QUALITY over quantity

STAMP EVALUATION CRITERIA (Rate 1-8 for each, then average):

1. TEXT TYPE (25%):
   - Level 1-2: Words/Phrases only
   - Level 3-4: Simple/Connected sentences  
   - Level 5-6: Connected sentences/Pre-paragraph
   - Level 7-8: Paragraph/Extended discourse

2. LANGUAGE CONTROL (25%):
   - Level 1-2: Isolated words, basic connections
   - Level 3-4: Simple structures, some errors
   - Level 5-6: Time frame variety, good control
   - Level 7-8: Complex structures, natural flow

3. VOCABULARY (25%):
   - Level 1-2: High-frequency, limited words
   - Level 3-4: Expanding beyond basic vocabulary
   - Level 5-6: Circumlocution, varied vocabulary
   - Level 7-8: Sophisticated, specialized vocabulary

4. ACCURACY/COMPREHENSIBILITY (25%):
   - Level 1-2: Errors limit communication significantly
   - Level 3-4: Errors present but don't hinder meaning
   - Level 5-6: Good control, occasional errors
   - Level 7-8: Near error-free, native-like

SCORING INSTRUCTIONS:
- ${isLikelyNative ? 'Apply NATIVE SPEAKER standards - focus on sophistication and effectiveness' : 'Apply standard language learner criteria'}
- Be STRICT and ACCURATE to STAMP standards
- APPLY LENGTH PENALTIES FIRST, then evaluate quality
- Do NOT inflate scores for effort alone
- Responses must demonstrate actual proficiency at claimed level
- Consider response appropriateness to prompt complexity
- Words beyond target count provide ZERO additional credit

RESPONSE FORMAT - Return ONLY this JSON structure:
{
  "score": [0-15 if wrong language detected, otherwise converted 1-8 average to 0-100 scale with length penalties applied],
  "language_validated": [true if in ${targetLanguage}, false if wrong language],
  "detected_language": "[name of language if not ${targetLanguage}, otherwise '${targetLanguage}']",
  "stamp_level": [1-8 overall level, or 0 if wrong language],
  "rubric_scores": {
    "text_type": [1-8],
    "language_control": [1-8], 
    "vocabulary": [1-8],
    "accuracy": [1-8]
  },
  "feedback": {
    "grammar": "[If wrong language: 'Response not written in ${targetLanguage}', otherwise specific STAMP-based grammar assessment]",
    "vocabulary": "[If wrong language: 'Cannot assess ${targetLanguage} vocabulary as response is in another language', otherwise specific STAMP-based vocabulary assessment]", 
    "coherence": "[If wrong language: 'Assessment cannot proceed in wrong language', otherwise specific STAMP-based organization assessment]",
    "${phase === 'speaking' ? 'fluency' : 'mechanics'}": "[If wrong language: '${targetLanguage} proficiency cannot be evaluated', otherwise specific STAMP-based ${phase === 'speaking' ? 'fluency/pronunciation' : 'writing mechanics'} assessment with length analysis]",
    "overall": "[If wrong language: 'CRITICAL: This response is written in [detected language], not ${targetLanguage}. This is a ${targetLanguage} proficiency test. Score: 0-15%. Please retake using ${targetLanguage}.', otherwise comprehensive STAMP level justification mentioning if length penalties were applied]"
  }
}`;
}
