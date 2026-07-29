import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflight, json } from "../_shared/cors.ts";
import { hmacHex, signingSecret, timingSafeEqualHex } from "../_shared/grading.ts";

/**
 * Verifies a school certification code.
 *
 * Uses the SAME secret (CERT_SIGNING_SECRET) and the SAME full-length HMAC as
 * generate-certification-code, compares in constant time, and enforces expiry
 * and max_uses from the server-stored row (never from the client).
 */

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count++;
  return true;
}

const fail = (req: Request, error: string, status: number, extra: Record<string, unknown> = {}) =>
  json(req, { isValid: false, error, usageCount: 0, maxUsage: 0, ...extra }, status);

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const clientIP = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    if (!checkRateLimit(clientIP)) {
      return fail(req, "Too many requests", 429);
    }

    let secret: string;
    try {
      secret = signingSecret();
    } catch (_e) {
      console.error("CERT_SIGNING_SECRET is not configured");
      return fail(req, "Server configuration error", 500);
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024) {
      return fail(req, "Request too large", 413);
    }

    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.code === "string" ? body.code.trim() : "";
    const code = raw.replace(/[^a-zA-Z0-9-]/g, "");
    if (!code || code !== raw) {
      return fail(req, "Invalid code format", 400);
    }

    // CERT-{schoolId}-{studentId}-{timestamp}-{hmac}
    const parts = code.split("-");
    if (parts.length !== 5 || parts[0] !== "CERT") {
      return fail(req, "Invalid code format", 400);
    }
    const [, schoolId, studentId, timestamp, providedSignature] = parts;
    if (!/^\d+$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(providedSignature)) {
      return fail(req, "Invalid code format", 400);
    }

    const computedSignature = await hmacHex(secret, `${schoolId}-${studentId}-${timestamp}`);
    if (!timingSafeEqualHex(computedSignature, providedSignature)) {
      console.log("[SECURITY] Signature verification failed", { ip: clientIP });
      return fail(req, "Invalid code signature", 400);
    }

    // Service role: expiry, revocation and usage limits are read from the
    // server-stored row so a client can never widen its own allowance.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: row, error: rowError } = await supabase
      .from("certification_codes")
      .select("id, max_uses, expires_at, is_active, school_id, student_id")
      .eq("code", code)
      .maybeSingle();

    if (rowError) {
      console.error("Error loading code:", rowError.message);
      return fail(req, "Verification unavailable", 500);
    }
    if (!row) {
      return fail(req, "Code not found", 404);
    }
    if (row.is_active === false) {
      return fail(req, "Code has been deactivated", 403);
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return fail(req, "Code has expired", 403);
    }

    const maxUsage = typeof row.max_uses === "number" && row.max_uses > 0 ? row.max_uses : 3;

    const { count, error: usageError } = await supabase
      .from("code_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("code", code);

    if (usageError) {
      console.error("Error checking code usage:", usageError.message);
      return fail(req, "Verification unavailable", 500);
    }

    const usageCount = count ?? 0;
    if (usageCount >= maxUsage) {
      return json(
        req,
        { isValid: false, error: "Code usage limit exceeded", usageCount, maxUsage },
        403,
      );
    }

    return json(req, {
      isValid: true,
      usageCount,
      maxUsage,
      schoolId: row.school_id ?? schoolId,
      studentId: row.student_id ?? studentId,
    });
  } catch (error) {
    console.error("Error in verify-certification-code:", error instanceof Error ? error.message : error);
    return fail(req, "Internal server error", 500);
  }
});
