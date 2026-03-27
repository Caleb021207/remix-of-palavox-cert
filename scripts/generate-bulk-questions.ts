import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jyvmhtterlpszklhgjwp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Import topic banks
const READING_TOPICS_BY_LEVEL: Record<string, string[]> = {
  'A1': ['daily routines', 'family members', 'favorite foods', 'simple weather', 'basic colors', 'common animals', 'parts of house', 'school objects', 'days of week', 'telling time', 'personal belongings', 'simple greetings'],
  'A2': ['weekend activities', 'simple travel plans', 'school experiences', 'health and fitness', 'hobbies and interests', 'shopping habits', 'local transportation', 'simple instructions', 'neighborhood description', 'past events', 'future plans', 'simple problems'],
  'B1': ['social media impact', 'environmental awareness', 'work-life balance', 'cultural differences', 'technology in education', 'healthy lifestyles', 'urban development', 'travel experiences', 'personal achievements', 'career choices', 'community issues', 'consumer rights'],
  'B2': ['climate policy debates', 'education reform', 'digital privacy', 'economic inequality', 'globalization effects', 'healthcare systems', 'renewable energy', 'artificial intelligence ethics', 'immigration policy', 'workplace automation', 'mental health awareness', 'sustainable development'],
  'C1': ['constitutional law', 'macroeconomic theory', 'neuroscience research', 'political philosophy', 'quantum physics', 'literary criticism', 'historical analysis', 'ethical frameworks', 'cognitive psychology', 'international relations', 'public policy analysis', 'scientific methodology'],
  'C2': ['epistemology', 'postmodern theory', 'bioethics', 'geopolitical strategy', 'advanced statistics', 'philosophical logic', 'comparative literature', 'systems theory', 'cultural anthropology', 'theoretical physics', 'political economy', 'semiotics']
};

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LANGUAGES = ['spanish', 'french', 'german', 'italian', 'portuguese', 'english'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TARGET_PER_LEVEL = 100; // 100 questions per level for variety
const BATCH_SIZE = 20; // Generate 20 at a time

async function generateQuestionsForCombo(language: string, level: string) {
  console.log(`\n📝 Generating questions for ${language} - ${level}...`);
  
  // Check existing count
  const { count: existingCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('language', language)
    .eq('level', level)
    .eq('type', 'multipleChoice');
  
  const existing = existingCount || 0;
  const needed = TARGET_PER_LEVEL - existing;
  
  if (needed <= 0) {
    console.log(`✅ Already have ${existing} questions, skipping`);
    return;
  }
  
  console.log(`📊 Current: ${existing}, Target: ${TARGET_PER_LEVEL}, Generating: ${needed}`);
  
  // Get topics for this level and distribute questions evenly
  const topics = READING_TOPICS_BY_LEVEL[level] || [];
  const questionsPerTopic = Math.ceil(needed / topics.length);
  
  console.log(`📚 Distributing across ${topics.length} topics (~${questionsPerTopic} questions per topic)`);
  
  // Generate questions for each topic
  for (const topic of topics) {
    console.log(`  📖 Topic: "${topic}"...`);
    
    const batches = Math.ceil(questionsPerTopic / BATCH_SIZE);
    
    for (let i = 0; i < batches; i++) {
      const batchNum = i + 1;
      const questionsInBatch = Math.min(BATCH_SIZE, questionsPerTopic - (i * BATCH_SIZE));
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-questions', {
          body: {
            testType: 'multipleChoice',
            level,
            count: questionsInBatch,
            language,
            topicCategory: topic, // Constrain to specific topic
            batchMode: true,
            batchSize: questionsInBatch
          }
        });
        
        if (error) {
          console.error(`    ❌ Error: ${error.message}`);
          continue;
        }
        
        console.log(`    ✅ Generated ${data?.questions?.length || 0} questions`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`    ❌ Failed:`, err);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting bulk question generation...\n');
  console.log(`Target: ${LANGUAGES.length} languages × ${LEVELS.length} levels × ${TARGET_PER_LEVEL} questions = ${LANGUAGES.length * LEVELS.length * TARGET_PER_LEVEL} questions\n`);
  
  for (const language of LANGUAGES) {
    console.log(`\n🌍 Processing ${language.toUpperCase()}...`);
    
    for (const level of LEVELS) {
      await generateQuestionsForCombo(language, level);
    }
  }
  
  // Final summary
  console.log('\n\n📊 Final Summary:');
  const { data: summary } = await supabase
    .from('questions')
    .select('language, level, count:id.count()')
    .eq('type', 'multipleChoice')
    .order('language')
    .order('level');
  
  console.table(summary);
  
  console.log('\n✅ Bulk generation complete!');
}

main().catch(console.error);
