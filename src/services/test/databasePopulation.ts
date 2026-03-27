
import { TARGET_LANGUAGE, BASE_LANGUAGE } from '@/config/languageConfig';
import { supabase } from '@/integrations/supabase/client';

// Enhanced database population with systematic generation and progress tracking
export async function populateQuestionDatabase(): Promise<void> {
  const testTypes = ['multipleChoice', 'fillInBlank', 'shortAnswer', 'audioResponse'];
  const levels = ['novice', 'intermediate', 'advanced'];
  const targetPerCategory = 500;
  
  console.log('🚀 Starting enhanced database population...');
  console.log(`📋 Target: ${testTypes.length * levels.length * targetPerCategory} total questions`);

  try {
    let totalGenerated = 0;
    const totalCategories = testTypes.length * levels.length;
    let completedCategories = 0;

    for (const testType of testTypes) {
      for (const level of levels) {
        completedCategories++;
        console.log(`📊 Progress: ${completedCategories}/${totalCategories} categories - Checking ${testType} - ${level}`);
        
        // Check current count using our database function
        const { data: stats } = await supabase
          .rpc('trigger_question_generation', {
            p_test_type: testType,
            p_level: level,
            p_target_count: targetPerCategory
          });

        const needsGeneration = stats?.[0]?.needs_generation;
        const currentCount = stats?.[0]?.current_count || 0;

        if (needsGeneration) {
          const questionsNeeded = targetPerCategory - currentCount;
          console.log(`🔄 Generating ${questionsNeeded} questions for ${testType} - ${level} (current: ${currentCount})`);
          
          try {
            // Generate in chunks to avoid timeouts
            const chunkSize = 100;
            let generatedForCategory = 0;
            
            for (let i = 0; i < questionsNeeded; i += chunkSize) {
              const batchSize = Math.min(chunkSize, questionsNeeded - i);
              
              const response = await fetch(`/functions/v1/generate-questions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  testType, 
                  level, 
                  count: batchSize,
                  targetLanguage: TARGET_LANGUAGE,
                  baseLanguage: BASE_LANGUAGE,
                  batchMode: true,
                  batchSize: 20
                }),
              });

              if (response.ok) {
                const result = await response.json();
                generatedForCategory += result.generated || 0;
                totalGenerated += result.generated || 0;
                console.log(`✅ Generated ${result.generated} questions for ${testType} - ${level} (batch ${Math.floor(i/chunkSize) + 1})`);
              } else {
                const error = await response.json();
                console.error(`❌ Failed to generate batch for ${testType} - ${level}:`, error);
              }
              
              // Add delay between chunks to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log(`✅ Completed ${testType} - ${level}: ${generatedForCategory} questions generated`);
            
          } catch (error) {
            console.error(`❌ Error generating questions for ${testType} - ${level}:`, error);
          }
          
          // Add delay between categories to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log(`✅ Sufficient questions exist for ${testType} - ${level}: ${currentCount}`);
        }
      }
    }
    
    console.log(`🎉 Database population complete! Generated ${totalGenerated} total questions`);
  } catch (error) {
    console.error('❌ Error populating question database:', error);
  }
}
