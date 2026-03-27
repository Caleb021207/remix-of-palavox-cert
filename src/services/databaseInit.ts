
import { populateQuestionDatabase } from './test/questionsService';
import { supabase } from '@/integrations/supabase/client';

// Enhanced database initialization with comprehensive question generation
export const initializeDatabase = async () => {
  try {
    console.log('🚀 Starting enhanced database initialization...');
    
    // Check if database has been recently populated
    const lastPopulated = localStorage.getItem('lastDatabasePopulation');
    const daysSincePopulation = lastPopulated 
      ? (Date.now() - parseInt(lastPopulated)) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    // Check total question count across all categories and languages
    const { count: totalQuestions, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error checking question count:', error);
      return;
    }
    
    // Target: 500 questions per category × 3 levels × 4 test types × 6 languages = 36,000 total
    const targetTotalQuestions = 36000;
    const currentQuestionCount = totalQuestions || 0;
    
    console.log(`📊 Database status: ${currentQuestionCount}/${targetTotalQuestions} questions across all languages`);
    
    // Populate if we have less than 5% of target or haven't populated in 7 days
    const shouldPopulate = currentQuestionCount < targetTotalQuestions * 0.05 || daysSincePopulation > 7;
    
    if (shouldPopulate) {
      console.log('🔄 Starting comprehensive multi-language database population...');
      
      // Show user that population is starting
      if (currentQuestionCount < 1000) {
        console.log('⏳ First-time multi-language database setup - this will take several minutes...');
        console.log('💡 You can continue using the app while questions are generated in the background');
      }
      
      // Start background population without blocking the app
      populateQuestionDatabase().then(() => {
        console.log('✅ Background multi-language database population completed');
        localStorage.setItem('lastDatabasePopulation', Date.now().toString());
        localStorage.setItem('questionsPopulated', 'true');
      }).catch((error) => {
        console.error('❌ Background population failed:', error);
      });
      
      // Don't wait for population to complete - let the app start
      console.log('✅ Multi-language database initialization started (running in background)');
    } else {
      console.log('✅ Database already well-populated across languages, skipping initialization');
    }
    
    // Always run a quick maintenance check
    await performDatabaseMaintenance();
    
  } catch (error) {
    console.error('❌ Error initializing enhanced database:', error);
  }
};

// Perform database maintenance tasks
async function performDatabaseMaintenance() {
  try {
    console.log('🔧 Running database maintenance...');
    
    // Clean up old generation batches (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('question_generation_batches')
      .delete()
      .lt('created_at', thirtyDaysAgo);
    
    // Reset usage counts for questions used more than 100 times
    await supabase
      .from('questions')
      .update({ usage_count: 0, last_used_at: null })
      .gt('usage_count', 100);
    
    console.log('✅ Database maintenance completed');
  } catch (error) {
    console.error('❌ Error during database maintenance:', error);
  }
}

// Get database statistics for admin/debugging
export async function getDatabaseStats() {
  try {
    // Get question counts by category and language
    const { data: questionsByType } = await supabase
      .from('questions')
      .select('type, level, language')
      .order('type')
      .order('level')
      .order('language');
    
    // Count questions by category and language
    const categoryStats = {};
    questionsByType?.forEach(q => {
      const key = `${q.language}-${q.type}-${q.level}`;
      categoryStats[key] = (categoryStats[key] || 0) + 1;
    });
    
    // Get language distribution
    const languageStats = {};
    questionsByType?.forEach(q => {
      languageStats[q.language] = (languageStats[q.language] || 0) + 1;
    });
    
    // Get recent generation activity
    const { data: recentBatches } = await supabase
      .from('question_generation_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get question analytics summary
    const { data: analyticsStats } = await supabase
      .from('question_analytics')
      .select('count(*), avg(difficulty_rating), avg(user_feedback_score)');
    
    return {
      categoryStats,
      languageStats,
      recentBatches,
      analyticsStats: analyticsStats?.[0] || {}
    };
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    return null;
  }
}

// Force regeneration of questions for a specific category and language (admin function)
export async function forceRegenerateCategory(testType: string, level: string, language: string = 'spanish') {
  try {
    console.log(`🔄 Force regenerating questions for ${testType} - ${level} - ${language}`);
    
    // Delete existing questions for this category and language
    await supabase
      .from('questions')
      .delete()
      .eq('type', testType)
      .eq('level', level)
      .eq('language', language);
    
    // Trigger new generation
    const response = await fetch(`${window.location.origin}/functions/v1/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        testType, 
        level, 
        count: 500,
        language,
        batchMode: true,
        batchSize: 25
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Successfully regenerated ${result.generated} questions for ${language}`);
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Generation failed: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Error force regenerating category:', error);
    throw error;
  }
}

// Check if initial population is needed
export async function needsInitialPopulation(): Promise<boolean> {
  try {
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    
    return (totalQuestions || 0) < 500; // Need population if less than 500 questions total
  } catch (error) {
    console.error('❌ Error checking if population needed:', error);
    return true; // Assume we need population if check fails
  }
}
