
import { supabase } from '@/integrations/supabase/client';

// Get question analytics for quality assessment
export async function getQuestionAnalytics(questionId: string) {
  try {
    const { data, error } = await supabase
      .from('question_analytics')
      .select('*')
      .eq('question_id', questionId)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching question analytics:', error);
    return null;
  }
}

// Update question analytics after user response
export async function updateQuestionAnalytics(
  questionId: string, 
  isCorrect: boolean, 
  responseTime?: number
) {
  try {
    // Get existing analytics
    const { data: existing } = await supabase
      .from('question_analytics')
      .select('*')
      .eq('question_id', questionId)
      .maybeSingle();
    
    if (existing) {
      // Update existing record
      const newTotalResponses = existing.total_responses + 1;
      const newCorrectResponses = existing.correct_responses + (isCorrect ? 1 : 0);
      const newAverageTime = responseTime 
        ? ((existing.average_response_time || 0) * existing.total_responses + responseTime) / newTotalResponses
        : existing.average_response_time;
      
      await supabase
        .from('question_analytics')
        .update({
          total_responses: newTotalResponses,
          correct_responses: newCorrectResponses,
          average_response_time: newAverageTime,
          last_analyzed_at: new Date().toISOString()
        })
        .eq('question_id', questionId);
    } else {
      // Create new analytics record
      await supabase
        .from('question_analytics')
        .insert({
          question_id: questionId,
          total_responses: 1,
          correct_responses: isCorrect ? 1 : 0,
          average_response_time: responseTime || null,
          last_analyzed_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error updating question analytics:', error);
  }
}
