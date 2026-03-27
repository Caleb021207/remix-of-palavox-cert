import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

interface VerificationRequest {
  code: string;
}

interface VerificationResponse {
  isValid: boolean;
  usageCount: number;
  maxUsage: number;
  schoolId?: string;
  studentId?: string;
  error?: string;
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

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
  // Only allow alphanumeric characters and dashes for certification codes
  return input.trim().replace(/[^a-zA-Z0-9-]/g, '');
}

function logSecurityEvent(event: string, details: any) {
  console.log(`[SECURITY] ${event}:`, JSON.stringify(details));
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
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
      return new Response(
        JSON.stringify({ isValid: false, error: 'Too many requests', usageCount: 0, maxUsage: 3 }),
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

    // Content-Length check (max 1KB)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024) {
      logSecurityEvent('REQUEST_TOO_LARGE', { size: contentLength, ip: clientIP });
      return new Response(
        JSON.stringify({ isValid: false, error: 'Request too large', usageCount: 0, maxUsage: 3 }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { code }: VerificationRequest = await req.json();
    
    // Sanitize input
    const sanitizedCode = sanitizeInput(code);
    if (!sanitizedCode) {
      logSecurityEvent('INVALID_CODE_INPUT', { originalCode: code, ip: clientIP });
      return new Response(
        JSON.stringify({ isValid: false, error: 'Invalid code format', usageCount: 0, maxUsage: 3 }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Verifying certification code:', code);

    // Parse the certification code format: CERT-{schoolId}-{studentId}-{timestamp}-{hmac}
    const codeParts = code.split('-');
    if (codeParts.length < 5 || codeParts[0] !== 'CERT') {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Invalid code format', 
          usageCount: 0, 
          maxUsage: 3 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const schoolId = codeParts[1];
    const studentId = codeParts[2];
    const timestamp = codeParts[3];
    const providedSignature = codeParts.slice(4).join('-'); // In case signature contains dashes

    // Verify HMAC signature
    const secretKey = Deno.env.get('CERT_SECRET_KEY');
    if (!secretKey) {
      console.error('CERT_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Server configuration error', 
          usageCount: 0, 
          maxUsage: 3 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Recreate the payload and compute HMAC
    const payload = `${schoolId}-${studentId}-${timestamp}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const payloadData = encoder.encode(payload);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
    const computedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedSignature !== providedSignature) {
      console.log('Signature verification failed');
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Invalid code signature', 
          usageCount: 0, 
          maxUsage: 3 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check usage count in the database
    const { data: usageRecords, error: usageError } = await supabase
      .from('code_usage_log')
      .select('*')
      .eq('code', code);

    if (usageError) {
      console.error('Error checking code usage:', usageError);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Database error', 
          usageCount: 0, 
          maxUsage: 3 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const usageCount = usageRecords?.length || 0;
    const maxUsage = 3;

    if (usageCount >= maxUsage) {
      console.log(`Code ${code} has exceeded usage limit: ${usageCount}/${maxUsage}`);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Code usage limit exceeded', 
          usageCount, 
          maxUsage,
          schoolId,
          studentId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Code is valid and has remaining uses
    const response: VerificationResponse = {
      isValid: true,
      usageCount,
      maxUsage,
      schoolId,
      studentId
    };

    console.log('Code verification successful:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-certification-code:', error);
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        error: 'Internal server error', 
        usageCount: 0, 
        maxUsage: 3 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})