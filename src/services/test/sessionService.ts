
import { supabase } from '@/integrations/supabase/client';
import { TestSession, Json, TestType, CEFRLevel, ACTFLLevel } from '@/types';

// Save a test session to Supabase
export async function saveTestSession(session: TestSession): Promise<string> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to save test sessions');
    }

    const { data, error } = await supabase
      .from('test_sessions')
      .insert({
        user_id: user.id, // Ensure user_id is set
        test_type: session.testType,
        start_time: session.startTime.toISOString(),
        end_time: session.endTime?.toISOString(),
        score: session.score,
        cefr_level: session.cefr,
        actfl_level: session.actfl,
        feedback: session.feedback ? session.feedback as Json : null,
        subscription_verified: session.subscriptionVerified || false,
        payment_status: session.paymentStatus || null,
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    if (session.questions && session.answers) {
      // Save the user's answers
      const userAnswers = Object.entries(session.answers).map(([questionId, answer]) => {
        const question = session.questions?.find(q => q.id === questionId);
        let isCorrect = null;
        
        if (question?.type === 'multipleChoice' && question.options) {
          const selectedOption = question.options.find(opt => opt.id === answer);
          isCorrect = selectedOption?.isCorrect || false;
        } else if (question?.type === 'fillInBlank' && question.answer) {
          isCorrect = answer === question.answer;
        }
        
        return {
          session_id: data.id,
          question_id: questionId,
          user_answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
          is_correct: isCorrect,
        };
      });
      
      const { error: answersError } = await supabase
        .from('user_answers')
        .insert(userAnswers);
        
      if (answersError) {
        console.error('Error saving user answers:', answersError);
      }
    }
    
    return data.id;
  } catch (error) {
    console.error('Error in saveTestSession:', error);
    throw error;
  }
}

// Fetch a test session from Supabase
export async function getTestSession(sessionId: string): Promise<TestSession | null> {
  try {
    const { data, error } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (error) throw error;
    if (!data) return null;
    
    // Get the user's answers for this session
    const { data: answersData, error: answersError } = await supabase
      .from('user_answers')
      .select('*')
      .eq('session_id', sessionId);
      
    if (answersError) throw answersError;
    
    // Format the data to match our TestSession type
    const answers: Record<string, string | string[]> = {};
    answersData?.forEach(answer => {
      answers[answer.question_id] = answer.user_answer;
    });

    // Convert Json feedback to the expected format or set to undefined
    let typedFeedback: TestSession['feedback'] | undefined = undefined;
    
    if (data.feedback && typeof data.feedback === 'object') {
      // Use type assertion to handle the feedback object safely
      const feedbackObj = data.feedback as Record<string, any>;
      typedFeedback = {
        reading: feedbackObj.reading as string,
        writing: feedbackObj.writing as string,
        listening: feedbackObj.listening as string,
        speaking: feedbackObj.speaking as string,
        strengths: feedbackObj.strengths as string[],
        areas_for_improvement: feedbackObj.areas_for_improvement as string[],
        vocabulary: feedbackObj.vocabulary as string,
        grammar: feedbackObj.grammar as string,
        coherence: feedbackObj.coherence as string,
        fluency: feedbackObj.fluency as string,
        pronunciation: feedbackObj.pronunciation as string,
        interaction: feedbackObj.interaction as string,
        summary: feedbackObj.summary as string
      };
    }
    
    return {
      id: data.id,
      testType: data.test_type as TestType,
      startTime: new Date(data.start_time),
      endTime: data.end_time ? new Date(data.end_time) : undefined,
      score: data.score,
      cefr: data.cefr_level as CEFRLevel,
      actfl: data.actfl_level as ACTFLLevel,
      feedback: typedFeedback,
      answers,
    };
  } catch (error) {
    console.error('Error in getTestSession:', error);
    throw error;
  }
}
