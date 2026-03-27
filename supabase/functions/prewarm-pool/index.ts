import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Languages for which we generate bilingual content
const LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Russian', 'Ukrainian', 'Chinese', 'Japanese', 'Korean',
  'Hindi', 'Vietnamese', 'Indonesian', 'Arabic', 'Persian',
  'Urdu', 'Pashto', 'Swahili'
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Topic banks for each level and section
const TOPIC_BANKS: Record<string, Record<string, string[]>> = {
  reading: {
    A1: ['Daily Routines', 'Food & Meals', 'Family Members', 'Weather & Seasons', 'Colors & Numbers', 'School Supplies', 'Common Animals', 'Body Parts', 'Clothing Items', 'Transportation Basics'],
    A2: ['Past Experiences', 'Future Plans', 'Preferences & Opinions', 'Health & Wellness', 'Travel Basics', 'Technology Use', 'Sports & Exercise', 'Entertainment', 'Work & Jobs', 'Friendships'],
    B1: ['Environmental Issues', 'Cultural Traditions', 'Educational Systems', 'Career Development', 'Social Media Impact', 'Urban vs Rural Life', 'Personal Goals', 'Consumer Habits', 'Health & Fitness Trends', 'Language Learning'],
    B2: ['Climate Change', 'Economic Trends', 'Technological Innovation', 'Social Justice', 'Mental Health Awareness', 'Global Politics', 'Scientific Discoveries', 'Cultural Diversity', 'Ethics & Morality', 'Sustainability'],
    C1: ['Philosophical Concepts', 'Literary Analysis', 'Political Theory', 'Economic Policy', 'Scientific Research', 'Historical Interpretation', 'Sociological Trends', 'Psychological Studies', 'Legal Frameworks', 'Artistic Movements'],
    C2: ['Abstract Reasoning', 'Interdisciplinary Research', 'Theoretical Frameworks', 'Complex Argumentation', 'Nuanced Analysis', 'Sophisticated Critique', 'Advanced Scholarship', 'Specialized Discourse', 'Intricate Narratives', 'Subtle Implications']
  },
  listening: {
    A1: ['Greetings & Introductions', 'Shopping Basics', 'Asking for Directions', 'Time & Clock', 'Simple Questions', 'Classroom Commands', 'Weekend Activities', 'Hobbies', 'House & Rooms', 'Personal Information'],
    A2: ['Making Appointments', 'Phone Conversations', 'Ordering Food', 'Describing Places', 'Comparing Things', 'Telling Stories', 'Giving Advice', 'Expressing Feelings', 'Discussing Prices', 'Planning Events'],
    B1: ['News Summaries', 'Product Reviews', 'Interview Excerpts', 'Travel Experiences', 'Problem Solving', 'Expressing Opinions', 'Making Suggestions', 'Describing Changes', 'Discussing Advantages', 'Explaining Procedures'],
    B2: ['Academic Lectures', 'Professional Presentations', 'Debates & Discussions', 'Documentary Clips', 'Expert Interviews', 'Conference Talks', 'Policy Explanations', 'Research Findings', 'Case Studies', 'Critical Analysis'],
    C1: ['Academic Seminars', 'Professional Symposiums', 'Complex Negotiations', 'Theoretical Discussions', 'Research Presentations', 'Policy Debates', 'Technical Briefings', 'Strategic Planning', 'Critical Reviews', 'Expert Panels'],
    C2: ['High-Level Discourse', 'Specialized Lectures', 'Complex Debates', 'Technical Symposiums', 'Advanced Seminars', 'Nuanced Discussions', 'Expert Consultations', 'Sophisticated Analysis', 'Strategic Dialogues', 'Professional Forums']
  },
  writing: {
    A2: ['Personal Experiences', 'Daily Life', 'Hobbies & Interests', 'Travel Plans', 'Friends & Family', 'Favorite Foods', 'Weekend Activities', 'My Neighborhood', 'School Memories', 'Simple Opinions'],
    B1: ['Cultural Topics', 'Social Issues', 'Technology Impact', 'Career Goals', 'Environmental Concerns', 'Travel Stories', 'Personal Achievements', 'Community Events', 'Health Choices', 'Media Influence'],
    C1: ['Complex Arguments', 'Policy Analysis', 'Research Topics', 'Ethical Dilemmas', 'Abstract Concepts', 'Social Commentary', 'Economic Perspectives', 'Scientific Debates', 'Historical Analysis', 'Cultural Critique']
  },
  speaking: {
    A1: ['Self Introduction', 'Describing Home', 'Favorite Things', 'Daily Activities', 'Simple Questions', 'Family Talk', 'Food Preferences', 'Weather Chat', 'Basic Needs', 'Greetings'],
    A2: ['Travel Stories', 'Shopping Experiences', 'Making Plans', 'Giving Directions', 'Phone Conversations', 'Restaurant Ordering', 'Describing People', 'Past Events', 'Future Plans', 'Hobbies Discussion'],
    B1: ['Problem Solving', 'Giving Advice', 'Expressing Opinions', 'Describing Changes', 'Discussing Advantages', 'Comparing Options', 'Narrating Events', 'Explaining Reasons', 'Making Recommendations', 'Handling Complaints'],
    B2: ['Debates', 'Presentations', 'Complex Opinions', 'Hypothetical Situations', 'Critical Analysis', 'Professional Discussions', 'Cultural Comparisons', 'News Commentary', 'Career Conversations', 'Abstract Topics'],
    C1: ['Academic Topics', 'Professional Discussions', 'Abstract Concepts', 'Complex Negotiations', 'Strategic Planning', 'Research Explanations', 'Policy Discussions', 'Ethical Debates', 'Theoretical Arguments', 'Expert Analysis'],
    C2: ['Specialized Discourse', 'High-Level Debates', 'Expert Analysis', 'Complex Negotiations', 'Strategic Discussions', 'Nuanced Arguments', 'Philosophical Topics', 'Advanced Critique', 'Interdisciplinary Topics', 'Sophisticated Reasoning']
  }
};

// Generate reading/listening content using OpenAI
async function generateComprehensionContent(
  section: string,
  level: string,
  language: string,
  topic: string
): Promise<any> {
  const wordCounts: Record<string, string> = {
    A1: '50-80',
    A2: '80-120',
    B1: '150-200',
    B2: '200-280',
    C1: '280-350',
    C2: '350-450'
  };

  const prompt = `Generate a ${section} comprehension passage in English for ESL learners at CEFR ${level} level.

Topic: ${topic}
Word count: ${wordCounts[level]} words
Target native language: ${language} (for question translations)

Requirements:
1. Passage in clear, level-appropriate English
2. 4 multiple-choice questions with 4 options each (A, B, C, D)
3. Questions should test comprehension, not just word matching
4. For each question, include the question text in BOTH English AND ${language}
5. Include the correct answer key

Return as JSON:
{
  "passage": "The passage text here...",
  "level": "${level}",
  "topicCategory": "${topic}",
  "questions": [
    {
      "id": "q1",
      "text": "English question text?",
      "textNative": "${language} translation of question",
      "options": [
        { "id": "a", "text": "Option A", "textNative": "${language} translation", "isCorrect": false },
        { "id": "b", "text": "Option B", "textNative": "${language} translation", "isCorrect": true },
        { "id": "c", "text": "Option C", "textNative": "${language} translation", "isCorrect": false },
        { "id": "d", "text": "Option D", "textNative": "${language} translation", "isCorrect": false }
      ]
    }
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an ESL content generator. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  
  return {
    ...content,
    section,
    baseLanguage: language
  };
}

// Generate writing prompt with bilingual support
async function generateWritingPrompt(level: string, language: string, topic: string): Promise<any> {
  const wordTargets: Record<string, string> = {
    A2: '50-100',
    B1: '100-200',
    C1: '200-350'
  };

  const prompt = `Generate a writing prompt for ESL learners at CEFR ${level} level.

Topic: ${topic}
Target word count: ${wordTargets[level] || '100-200'} words
Native language: ${language}

Requirements:
1. Clear, specific writing task appropriate for ${level}
2. Provide the prompt in BOTH English AND ${language}
3. Include instructions in both languages saying to write in English
4. Include a brief rubric/criteria for evaluation

Return as JSON:
{
  "level": "${level}",
  "prompt": "The writing prompt in English...",
  "prompt_english": "The writing prompt in English...",
  "prompt_native": "The writing prompt in ${language}...",
  "instructions_english": "Write your response in English. Target: ${wordTargets[level] || '100-200'} words.",
  "instructions_native": "${language} translation of instructions",
  "evaluationCriteria": ["criterion 1", "criterion 2", "criterion 3"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an ESL content generator. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Generate speaking prompt with bilingual support
async function generateSpeakingPrompt(level: string, language: string, topic: string): Promise<any> {
  const durations: Record<string, string> = {
    A1: '30-45 seconds',
    A2: '30-60 seconds',
    B1: '45-60 seconds',
    B2: '60-90 seconds',
    C1: '60-90 seconds',
    C2: '90-120 seconds'
  };

  const prompt = `Generate a speaking prompt for ESL learners at CEFR ${level} level.

Topic: ${topic}
Native language: ${language}
Expected duration: ${durations[level] || '45-60 seconds'}

Requirements:
1. A main speaking task appropriate for ${level}
2. 2-3 follow-up questions
3. Provide ALL text in BOTH English AND ${language}
4. Include expected speaking time

Return as JSON:
{
  "level": "${level}",
  "prompt": "Main prompt in English...",
  "prompt_english": "Main prompt in English...",
  "mainPromptNative": "${language} translation...",
  "followUpQuestions": [
    { "english": "Why do you think...?", "native": "${language} translation" }
  ],
  "topicCategory": "${topic}",
  "expectedDuration": "${durations[level] || '45-60 seconds'}",
  "instructions": "Speak naturally about...",
  "instructions_english": "Speak naturally about...",
  "initial_cta_native": "Press the button and start speaking in ${language}",
  "initial_cta_english": "Press the button and start speaking"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an ESL content generator. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Build prioritized queue of content to generate
async function buildGenerationQueue(
  supabase: any, 
  targetItemsPerLevel: number,
  prioritySections?: string[]
): Promise<Array<{section: string, level: string, language: string, needed: number}>> {
  const queue: Array<{section: string, level: string, language: string, needed: number, priority: number}> = [];
  
  const sections = prioritySections || ['reading', 'listening', 'writing', 'speaking'];
  
  for (const section of sections) {
    const sectionLevels = Object.keys(TOPIC_BANKS[section] || {});
    
    for (const level of sectionLevels) {
      for (const language of LANGUAGES) {
        const languageKey = language.toLowerCase();
        
        // Check current count for this combination
        const { count: currentCount } = await supabase
          .from('cert_content_pool')
          .select('*', { count: 'exact', head: true })
          .eq('section', section)
          .eq('level', level)
          .eq('language', languageKey)
          .eq('version', 'v1-gpt4o-mini');

        const needed = Math.max(0, targetItemsPerLevel - (currentCount || 0));
        
        if (needed > 0) {
          // Priority: less content = higher priority
          const priority = targetItemsPerLevel - (currentCount || 0);
          queue.push({ section, level, language: languageKey, needed, priority });
        }
      }
    }
  }
  
  // Sort by priority (highest first) then randomize within same priority
  queue.sort((a, b) => b.priority - a.priority);
  
  return queue;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      jobId, 
      targetItemsPerLevel = 10, 
      dryRun = false, 
      batchSize = 30,
      prioritySections
    } = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`🚀 Starting pool prewarm for job ${jobId}`);
    console.log(`   Target: ${targetItemsPerLevel}/level, Batch: ${batchSize}`);
    if (prioritySections) console.log(`   Priority sections: ${prioritySections.join(', ')}`);
    
    // Update job status to running
    await supabase
      .from('prewarm_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', jobId);
    
    let totalGenerated = 0;
    let totalSkipped = 0;
    let processed = 0;
    const results: any[] = [];
    const errors: any[] = [];
    const sectionStats: Record<string, number> = {};

    // Build prioritized queue
    const queue = await buildGenerationQueue(supabase, targetItemsPerLevel, prioritySections);
    console.log(`📋 Queue has ${queue.length} combinations needing content`);
    
    // Process queue items
    for (const item of queue) {
      if (processed >= batchSize) {
        console.log(`⏸️ Reached batch limit of ${batchSize}`);
        break;
      }

      const { section, level, language } = item;
      const topics = TOPIC_BANKS[section]?.[level] || [];
      
      if (topics.length === 0) {
        console.log(`⚠️ No topics for ${section}/${level}`);
        continue;
      }

      // Pick a random topic
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const languageDisplay = language.charAt(0).toUpperCase() + language.slice(1);
      
      console.log(`📝 Generating: ${section}/${level}/${language} - ${topic}`);
      
      if (dryRun) {
        console.log(`  [DRY RUN] Would generate`);
        processed++;
        continue;
      }

      try {
        let content: any;
        
        if (section === 'reading' || section === 'listening') {
          content = await generateComprehensionContent(section, level, languageDisplay, topic);
        } else if (section === 'writing') {
          content = await generateWritingPrompt(level, languageDisplay, topic);
        } else if (section === 'speaking') {
          content = await generateSpeakingPrompt(level, languageDisplay, topic);
        }

        // Generate stem hash
        const stemText = content.passage || content.prompt_english || content.prompt || content.mainPromptEnglish || '';
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(stemText));
        const stemHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Get next variation number
        const { data: maxVar } = await supabase
          .from('cert_content_pool')
          .select('variation')
          .eq('section', section)
          .eq('level', level)
          .eq('language', language)
          .eq('version', 'v1-gpt4o-mini')
          .order('variation', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const nextVariation = (maxVar?.variation || 0) + 1;

        // Insert into pool
        const { error: insertError } = await supabase
          .from('cert_content_pool')
          .insert({
            section,
            level,
            language,
            base_language: language,
            version: 'v1-gpt4o-mini',
            payload: content,
            stem_hash: stemHash,
            generation_cost_usd: 0.002,
            used_count: 0,
            variation: nextVariation
          });

        if (insertError) {
          console.error(`  ❌ Insert error:`, insertError);
          errors.push({ section, level, language, error: insertError.message });
        } else {
          console.log(`  ✓ Generated variation ${nextVariation}`);
          totalGenerated++;
          sectionStats[section] = (sectionStats[section] || 0) + 1;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
        
      } catch (genError: any) {
        console.error(`  ❌ Generation error:`, genError.message);
        errors.push({ section, level, language, error: genError.message });
      }

      results.push({ section, level, language, topic });
      processed++;

      // Update job progress every 5 items
      if (processed % 5 === 0) {
        await supabase
          .from('prewarm_jobs')
          .update({
            progress: {
              processed,
              totalGenerated,
              totalSkipped,
              sectionStats,
              lastProcessed: `${section}/${level}/${language}`
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    }

    // Get final counts by section
    const finalStats: Record<string, number> = {};
    for (const section of ['reading', 'listening', 'writing', 'speaking']) {
      const { count } = await supabase
        .from('cert_content_pool')
        .select('*', { count: 'exact', head: true })
        .eq('section', section)
        .eq('version', 'v1-gpt4o-mini');
      finalStats[section] = count || 0;
    }

    const { count: finalTotal } = await supabase
      .from('cert_content_pool')
      .select('*', { count: 'exact', head: true })
      .eq('version', 'v1-gpt4o-mini');

    console.log(`\n📊 Batch Complete:`);
    console.log(`   Generated: ${totalGenerated}`);
    console.log(`   By section:`, sectionStats);
    console.log(`   Pool totals:`, finalStats);
    console.log(`   Total in pool: ${finalTotal}`);

    // Mark job as completed
    await supabase
      .from('prewarm_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: {
          processed,
          totalGenerated,
          totalSkipped,
          totalInPool: finalTotal,
          sectionStats,
          finalStats,
          errors: errors.length,
          remainingInQueue: queue.length - processed
        }
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({
      success: true,
      totalGenerated,
      totalSkipped,
      processed,
      totalInPool: finalTotal,
      sectionStats,
      finalStats,
      errors,
      remainingInQueue: queue.length - processed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Prewarm error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
