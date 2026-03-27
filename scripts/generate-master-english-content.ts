#!/usr/bin/env bun
/**
 * Master English Content Pool Generator
 * 
 * Generates 8 variations per CEFR level for each test section:
 * - Reading: 8 × 6 levels = 48 passages
 * - Listening: 8 × 6 levels = 48 audio scripts
 * - Writing: 8 × 6 levels = 48 prompts
 * Total: 192 items (estimated cost: ~$6)
 * 
 * Content is ALWAYS in English, regardless of UI language.
 * UI languages (Spanish, Vietnamese, etc.) only affect instructions.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jyvmhtterlpszklhgjwp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

const CERT_CONTENT_VERSION = 'v1-english-master';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VARIATIONS = 8; // 8 variations per level

if (!SUPABASE_SERVICE_KEY || !OPENAI_API_KEY || !LOVABLE_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, LOVABLE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface GenerationProgress {
  section: string;
  level: string;
  variation: number;
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
}

async function generateReadingPassage(level: string, variation: number): Promise<any> {
  console.log(`📖 Generating Reading ${level} variation ${variation}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an English language assessment expert creating reading passages for ESL learners.
Create a ${level} CEFR level reading passage in English.

LEVEL GUIDELINES:
- A1: 50-75 words, simple present tense, basic vocabulary
- A2: 75-125 words, present/past tense, everyday topics
- B1: 125-200 words, various tenses, familiar topics with some complexity
- B2: 200-300 words, complex structures, abstract topics
- C1: 300-400 words, sophisticated language, nuanced ideas
- C2: 400-500 words, native-like complexity, specialized topics

Return ONLY the passage text, no extra formatting.`
        },
        {
          role: 'user',
          content: `Create variation ${variation} of an English reading passage for ${level} level learners.`
        }
      ],
      max_completion_tokens: 600,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateReadingQuestions(passage: string, level: string): Promise<any[]> {
  const questionCount = level === 'A1' || level === 'A2' ? 2 : level === 'C1' || level === 'C2' ? 1 : 2;
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Generate ${questionCount} multiple-choice comprehension questions in English for this passage.
Each question must have 4 options with randomized correct answer position.
Return as JSON array: [{"id": "q1", "text": "question", "options": [{"id": "a", "text": "...", "isCorrect": true/false}]}]`
        },
        {
          role: 'user',
          content: `Passage:\n${passage}`
        }
      ],
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateListeningScript(level: string, variation: number): Promise<string> {
  console.log(`🎧 Generating Listening ${level} variation ${variation}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Create a ${level} CEFR level listening script in English.
Return ONLY the dialogue/narrative text for text-to-speech conversion.`
        },
        {
          role: 'user',
          content: `Create variation ${variation} of an English listening script for ${level} level learners.`
        }
      ],
      max_completion_tokens: 400,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateWritingPrompt(level: string, variation: number): Promise<string> {
  console.log(`✍️ Generating Writing ${level} variation ${variation}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Create a ${level} CEFR level writing prompt in English for ESL learners.
Return ONLY the prompt text with word count requirement.`
        },
        {
          role: 'user',
          content: `Create variation ${variation} of an English writing prompt for ${level} level learners.`
        }
      ],
      max_completion_tokens: 200,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateAndStoreContent(section: 'reading' | 'listening' | 'writing', level: string, variation: number) {
  try {
    let payload: any;
    
    if (section === 'reading') {
      const passage = await generateReadingPassage(level, variation);
      const questions = await generateReadingQuestions(passage, level);
      payload = { level, passage, questions };
    } else if (section === 'listening') {
      const script = await generateListeningScript(level, variation);
      // Note: Audio URL will be generated on-demand when needed
      payload = { level, script, audioUrl: null, questions: [] };
    } else if (section === 'writing') {
      const prompt = await generateWritingPrompt(level, variation);
      payload = { level, prompt };
    }

    // Store in pool
    const { error } = await supabase.from('cert_content_pool').insert({
      section,
      level,
      language: 'english', // Content is ALWAYS English
      version: CERT_CONTENT_VERSION,
      payload,
      variation,
      generation_cost_usd: 0.03,
      used_count: 0,
      usage_context: 'certification',
    });

    if (error) throw error;
    console.log(`✅ Stored ${section}/${level}/variation-${variation}`);
    
  } catch (error) {
    console.error(`❌ Error generating ${section}/${level}/variation-${variation}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Master English Content Pool Generation');
  console.log(`📊 Total items to generate: ${CEFR_LEVELS.length * VARIATIONS * 3} = 192 items`);
  console.log('⏱️ Estimated time: 10-15 minutes');
  console.log('💰 Estimated cost: ~$6\n');

  const sections: ('reading' | 'listening' | 'writing')[] = ['reading', 'listening', 'writing'];
  let totalGenerated = 0;
  let totalErrors = 0;

  for (const section of sections) {
    console.log(`\n📝 Generating ${section.toUpperCase()} content...`);
    
    for (const level of CEFR_LEVELS) {
      for (let variation = 1; variation <= VARIATIONS; variation++) {
        try {
          await generateAndStoreContent(section, level, variation);
          totalGenerated++;
          
          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          totalErrors++;
          console.error(`Failed to generate ${section}/${level}/variation-${variation}`);
        }
      }
    }
  }

  console.log('\n✨ Generation Complete!');
  console.log(`✅ Successfully generated: ${totalGenerated} items`);
  console.log(`❌ Errors: ${totalErrors} items`);
  console.log('\n📊 Content Pool Ready for Use!');
}

main().catch(console.error);
