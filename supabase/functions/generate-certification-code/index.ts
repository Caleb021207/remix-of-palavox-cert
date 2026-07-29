import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsFor, preflight, json } from "../_shared/cors.ts";
import { hmacHex, signingSecret, timingSafeEqualHex } from "../_shared/grading.ts";

/**
 * Issues a school certification code.
 *
 * Signing is unified with verify-certification-code: ONE secret
 * (CERT_SIGNING_SECRET), the FULL 64-character SHA-256 HMAC, and no
 * development fallback — the function refuses to run if the secret is unset.
 */
serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    // Fail closed if the signing secret is missing.
    let secret: string;
    try {
      secret = signingSecret();
    } catch (_e) {
      console.error("CERT_SIGNING_SECRET is not configured");
      return json(req, { error: "Server configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Unauthorized" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { schoolId, studentId, studentName, notes, expiresInDays, maxUses } = body ?? {};

    if (typeof schoolId !== "string" || typeof studentId !== "string" || !schoolId || !studentId) {
      return json(req, { error: "schoolId and studentId are required" }, 400);
    }
    // Codes are dash-delimited, so the parts must not contain dashes themselves.
    if (!/^[A-Za-z0-9_]+$/.test(schoolId) || !/^[A-Za-z0-9_]+$/.test(studentId)) {
      return json(req, { error: "schoolId and studentId must be alphanumeric" }, 400);
    }

    const days = Number.isFinite(Number(expiresInDays)) ? Math.trunc(Number(expiresInDays)) : 365;
    const uses = Number.isFinite(Number(maxUses)) ? Math.trunc(Number(maxUses)) : 3;
    if (days <= 0 || days > 3650) return json(req, { error: "expiresInDays out of range" }, 400);
    if (uses <= 0 || uses > 100) return json(req, { error: "maxUses out of range" }, 400);

    // Authorisation: admin, or school_admin of this school.
    const { data: roles, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("Error checking roles:", roleError.message);
      return json(req, { error: "Error checking permissions" }, 500);
    }

    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    const isSchoolAdmin = roles?.some(
      (r: { role: string; school_id: string | null }) =>
        r.role === "school_admin" && (r.school_id === schoolId || r.school_id === null),
    );

    if (!isAdmin && !isSchoolAdmin) {
      return json(req, { error: "Forbidden: you cannot generate codes for this school" }, 403);
    }

    const timestamp = Date.now();
    const message = `${schoolId}-${studentId}-${timestamp}`;
    // FULL hmac, not truncated — verify recomputes and compares the same length.
    const signatureHex = await hmacHex(secret, message);

    const code = `CERT-${schoolId}-${studentId}-${timestamp}-${signatureHex}`;

    // Sanity check: the code we just issued must verify against our own logic.
    if (!timingSafeEqualHex(signatureHex, await hmacHex(secret, message))) {
      return json(req, { error: "Signing failure" }, 500);
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: certCode, error: insertError } = await supabaseClient
      .from("certification_codes")
      .insert({
        code,
        school_id: schoolId,
        student_id: studentId,
        student_name: typeof studentName === "string" ? studentName.slice(0, 200) : null,
        generated_by: user.id,
        expires_at: expiresAt,
        max_uses: uses,
        notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting code:", insertError.message);
      return json(req, { error: "Error generating code" }, 500);
    }

    return new Response(
      JSON.stringify({ success: true, code, certificationCode: certCode }),
      { status: 200, headers: { ...corsFor(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error instanceof Error ? error.message : error);
    return json(req, { error: "Internal server error" }, 500);
  }
});
