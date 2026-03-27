import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { schoolId, studentId, studentName, notes, expiresInDays, maxUses } = await req.json();

    // Validate input
    if (!schoolId || !studentId) {
      return new Response(
        JSON.stringify({ error: 'schoolId and studentId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or school admin for this school
    const { data: roles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error checking roles:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = roles?.some(r => r.role === 'admin');
    const isSchoolAdmin = roles?.some(
      r => r.role === 'school_admin' && (r.school_id === schoolId || r.school_id === null)
    );

    if (!isAdmin && !isSchoolAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have permission to generate codes for this school' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate code with HMAC signature
    const timestamp = Date.now();
    const message = `${schoolId}-${studentId}-${timestamp}`;
    const secret = Deno.env.get('CERT_CODE_SECRET') || 'default-secret-change-in-production';
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(message)
    );
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 8);
    
    const code = `CERT-${schoolId}-${studentId}-${timestamp}-${signatureHex}`;

    // Calculate expiration date if specified
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert code into database
    const { data: certCode, error: insertError } = await supabaseClient
      .from('certification_codes')
      .insert({
        code,
        school_id: schoolId,
        student_id: studentId,
        student_name: studentName || null,
        generated_by: user.id,
        expires_at: expiresAt,
        max_uses: maxUses || 3,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error generating code', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated certification code:', code, 'for student:', studentId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        code,
        certificationCode: certCode
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
