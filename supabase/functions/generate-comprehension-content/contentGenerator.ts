
import { ReadingContent, LevelConfig } from './types.ts';
import { validateAnswerDistribution, shuffleAnswers } from './validation.ts';
import { getCognitiveReadingPrompt } from './cognitiveReadingComplexity.ts';
import { getRandomTopic, getTextTypeForLevel } from './topicPool.ts';
import { validateReadingContent } from './contentValidation.ts';
import { selectFreshTopic, hashTopic } from './topicBanksCEFR.ts';

// Retry with exponential backoff for rate-limited API calls
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Check for rate limit (429) or server errors (5xx)
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        const errorText = await response.text();
        console.warn(`⚠️ API returned ${response.status}, attempt ${attempt + 1}/${maxRetries + 1}:`, errorText);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = baseDelayMs * Math.pow(2, attempt);
          // Add jitter (±25%) to prevent thundering herd
          const jitter = delay * (0.75 + Math.random() * 0.5);
          console.log(`⏳ Retrying in ${Math.round(jitter)}ms...`);
          await new Promise(resolve => setTimeout(resolve, jitter));
          continue;
        }
        
        throw new Error(`API rate limited after ${maxRetries + 1} attempts: ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Only retry on network errors, not on other failures
      if (attempt < maxRetries && (error as Error).message?.includes('fetch')) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`⚠️ Network error, retrying in ${delay}ms:`, (error as Error).message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Helper: Generate reading passage with GPT-4o-mini
async function generateReadingPassage(
  level: string,
  randomTopic: string,
  textType: string,
  contentLanguage: string,
  openAIApiKey: string
): Promise<string> {
  const wordCountGuide = {
    'A1': '50-80 words',
    'A2': '80-120 words',
    'B1': '120-180 words',
    'B2': '180-250 words',
    'Advanced': '300-400 words'
  };

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a creative writer creating ${contentLanguage} reading passages for language learners.`
          },
          {
            role: 'user',
            content: `Write a ${level} level ${textType} in ${contentLanguage} about "${randomTopic}".

Length: ${wordCountGuide[level as keyof typeof wordCountGuide] || '100-150 words'}

Level requirements:
- A1: Very simple sentences, present tense, basic vocabulary
- A2: Simple sentences, present/past tense, everyday vocabulary
- B1: Varied sentences, multiple tenses, wider vocabulary
- B2: Complex sentences, nuanced vocabulary, abstract ideas
- Advanced: Sophisticated writing, rich vocabulary, complex structures

Return ONLY the passage text, nothing else.`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      }),
    },
    3, // max retries
    2000 // base delay 2s for OpenAI
  );

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    console.error('Empty passage response:', JSON.stringify(data, null, 2));
    throw new Error('GPT-4o-mini returned empty passage content');
  }

  return data.choices[0].message.content.trim();
}

// Helper: Generate questions with Gemini
async function generateReadingQuestions(
  passage: string,
  level: string,
  questionCount: number,
  contentLanguage: string,
  questionLanguage: string,
  randomTopic: string,
  lovableApiKey: string
): Promise<any[]> {
  const cognitiveReadingPrompt = getCognitiveReadingPrompt(level);

  const response = await fetchWithRetry(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a language assessment expert creating cognitively sophisticated reading comprehension questions.

${cognitiveReadingPrompt}

Your task: Analyze the reading passage and create ${questionCount} multiple-choice questions that test ${level}-level cognitive skills.`
          },
          {
            role: 'user',
            content: `READING PASSAGE (in ${contentLanguage}):
${passage}

Create ${questionCount} multiple choice questions in ${questionLanguage} that test ${level}-level comprehension.

QUESTION COMPLEXITY FOR ${level}:
- A1: Ask about EXPLICIT facts (What is mentioned? Who? What color?)
- A2: Ask about SIMPLE relationships (What happened after? Why did X?)
- B1: Ask about IMPLICIT meanings (What is implied? What's the purpose?)
- B2: Ask about NUANCED meanings and attitudes (Author's attitude? How does the argument develop?)
- Advanced: Ask about SUBTLE implications and critical analysis (What does this suggest? Underlying assumptions?)

CRITICAL REQUIREMENTS:
1. Questions and options in ${questionLanguage}
2. RANDOMIZE correct answer positions (a, b, c, d) - do NOT put all in same position
3. Each question has exactly 4 options (a, b, c, d)
4. Create sophisticated distractors requiring ${level}-level reasoning to eliminate

Return ONLY valid JSON array:
[
  {
    "id": "q1",
    "text": "Question text in ${questionLanguage}?",
    "options": [
      {"id": "a", "text": "Option A", "isCorrect": false},
      {"id": "b", "text": "Option B", "isCorrect": true},
      {"id": "c", "text": "Option C", "isCorrect": false},
      {"id": "d", "text": "Option D", "isCorrect": false}
    ]
  }
]`
          }
        ],
        max_tokens: 2000,
      }),
    },
    3, // max retries
    1500 // base delay 1.5s
  );

  const data = await response.json();
  
  console.log('📊 Gemini Response Status:', response.status);
  console.log('📊 Gemini Choices:', data.choices?.length || 0);
  
  if (!data.choices || data.choices.length === 0) {
    console.error('Empty choices array:', JSON.stringify(data, null, 2));
    throw new Error('Gemini returned no choices for questions');
  }
  
  const rawContent = data.choices[0]?.message?.content;
  if (!rawContent || rawContent.trim() === '') {
    console.error('Empty content from Gemini:', JSON.stringify(data, null, 2));
    throw new Error('Gemini returned empty question content');
  }

  try {
    // Strip markdown code blocks if present
    let cleanContent = rawContent.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    return JSON.parse(cleanContent.trim());
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    console.log('Raw Gemini content:', rawContent);
    
    // Gemini refused to generate questions - retry with simpler prompt
    console.log('⚠️ Gemini refused or returned invalid JSON, retrying with simpler prompt...');
    
    const retryResponse = await fetchWithRetry(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: `Create ${questionCount} simple comprehension questions in ${questionLanguage} about this passage:

${passage}

Return ONLY this JSON format (no explanation):
[{"id":"q1","text":"Question in ${questionLanguage}?","options":[{"id":"a","text":"Option","isCorrect":false},{"id":"b","text":"Option","isCorrect":true},{"id":"c","text":"Option","isCorrect":false},{"id":"d","text":"Option","isCorrect":false}]}]`
            }
          ],
          max_tokens: 2000,
        }),
      },
      2, // fewer retries for fallback
      1000
    );
    
    const retryData = await retryResponse.json();
    let retryContent = retryData.choices[0]?.message?.content?.trim() || '';
    
    if (retryContent.startsWith('```json')) {
      retryContent = retryContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (retryContent.startsWith('```')) {
      retryContent = retryContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    console.log('✅ Retry successful, parsing questions...');
    return JSON.parse(retryContent.trim());
  }
}

export async function generateReadingContent(
  levelConfig: LevelConfig,
  contentLanguage: string,
  questionLanguage: string,
  openAIApiKey: string,
  excludeTopics: string[] = []
): Promise<ReadingContent & { topicCategory: string; topicHash: string }> {
  const { level, questionCount } = levelConfig;
  
  // Select fresh topic from stratified bank, avoiding recently used ones
  const randomTopic = selectFreshTopic(level, 'reading', excludeTopics);
  const topicHash = hashTopic(level, 'reading', randomTopic);
  const textType = getTextTypeForLevel(level);
  console.log(`📚 Selected fresh topic: "${randomTopic}" (hash: ${topicHash})`);
  console.log(`🚫 Excluded ${excludeTopics.length} recently used topics`);
  
  try {
    // Step 1: Generate passage with GPT-4o-mini (faster, cheaper)
    console.log('📝 Generating passage with GPT-4o-mini...');
    const passage = await generateReadingPassage(level, randomTopic, textType, contentLanguage, openAIApiKey);
    console.log(`✅ Generated ${passage.length} character passage`);
    
    // Step 2: Generate questions with Gemini (sophisticated analysis)
    console.log('🎯 Generating questions with Gemini...');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let questions = await generateReadingQuestions(
      passage,
      level,
      questionCount,
      contentLanguage,
      questionLanguage,
      randomTopic,
      lovableApiKey
    );
    console.log(`✅ Generated ${questions.length} questions`);
    
    const content = { passage: passage, questions };
  
    // Validate and fix answer distribution if needed
    let finalQuestions = content.questions;
    
    if (!validateAnswerDistribution(finalQuestions)) {
      console.log('Reading content: Answer distribution failed validation, applying shuffle...');
      finalQuestions = shuffleAnswers(finalQuestions);
    }
    
    // Validate cognitive complexity
    const finalContent = {
      level,
      passage: content.passage,
      questions: finalQuestions
    };
    
    const validation = validateReadingContent(finalContent, level);
    if (!validation.isValid) {
      console.warn(`⚠️ Reading content validation issues (score: ${validation.score}):`, validation.issues);
    } else {
      console.log(`✅ Reading content validated (score: ${validation.score})`);
    }
    
    console.log(`✅ Generated cognitively enhanced ${level} reading content with ${finalQuestions.length} questions`);
    
    return {
      ...finalContent,
      topicCategory: randomTopic,
      topicHash: topicHash
    };
  } catch (error) {
    console.error('Error generating reading content:', error);
    throw error;
  }
}


function getCognitiveLevel(level: string): string {
  const mapping = {
    'A1': 'basic recall and recognition',
    'A2': 'simple understanding and application', 
    'B1': 'analysis and inference',
    'B2': 'critical evaluation and synthesis',
    'Advanced': 'expert-level analysis and creative interpretation'
  };
  return mapping[level as keyof typeof mapping] || 'basic recall';
}
