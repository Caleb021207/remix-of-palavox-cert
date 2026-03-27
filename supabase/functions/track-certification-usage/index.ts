import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // Higher limit for tracking

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  current.count++;
  return true;
}

function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input');
  }
  return input.trim().replace(/[^a-zA-Z0-9-]/g, '');
}

interface TrackUsageRequest {
  code: string;
  testSessionId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { code, testSessionId }: TrackUsageRequest = await req.json();
    
    // Sanitize inputs
    const sanitizedCode = sanitizeInput(code);
    const sanitizedSessionId = sanitizeInput(testSessionId);
    
    if (!sanitizedCode || !sanitizedSessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Code and test session ID are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Tracking certification code usage:', { code: sanitizedCode, testSessionId: sanitizedSessionId });

    // Parse the certification code to extract school and student IDs
    const codeParts = sanitizedCode.split('-');
    if (codeParts.length < 5 || codeParts[0] !== 'CERT') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid code format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const schoolId = codeParts[1];
    const studentId = codeParts[2];

    // Check if this specific test session has already been tracked
    const { data: existingUsage, error: checkError } = await supabase
      .from('code_usage_log')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('test_session_id', sanitizedSessionId);

    if (checkError) {
      console.error('Error checking existing usage:', checkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (existingUsage && existingUsage.length > 0) {
      console.log('Usage already tracked for this test session');
      return new Response(
        JSON.stringify({ success: true, message: 'Usage already tracked' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the usage
    const { error: insertError } = await supabase
      .from('code_usage_log')
      .insert({
        code: sanitizedCode,
        school_id: schoolId,
        student_id: studentId,
        test_session_id: sanitizedSessionId,
        used_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error logging code usage:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to log usage' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully tracked certification code usage');

    return new Response(
      JSON.stringify({ success: true, message: 'Usage tracked successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in track-certification-usage:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})