import { preflight, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/auth.ts";
import { hmacHex, signingSecret, timingSafeEqual } from "../_shared/grading.ts";

/**
 * Public certificate verification. Intentionally unauthenticated, but it only
 * ever returns the minimum needed to confirm authenticity — and it recomputes
 * the HMAC so a certificate cannot be fabricated in an image editor.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id") ?? "";
    let code = url.searchParams.get("code") ?? "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      id = typeof body.id === "string" ? body.id : id;
      code = typeof body.code === "string" ? body.code : code;
    }

    id = id.trim().replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    code = code.trim().replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);

    if (!id && !code) return json(req, { valid: false, error: "Certificate ID required" }, 400);

    const svc = serviceClient();
    const query = svc
      .from("certificates")
      .select("id, user_id, session_id, holder_name, cefr_level, functional_label, overall_score, issued_at, expires_at, revoked, signature, verification_code");

    const { data: cert } = id
      ? await query.eq("id", id).maybeSingle()
      : await query.eq("verification_code", code).maybeSingle();

    if (!cert) return json(req, { valid: false, error: "No certificate found with that ID" }, 404);

    const payload = `${cert.id}|${cert.user_id}|${cert.session_id}|${cert.cefr_level}|${new Date(cert.issued_at).toISOString()}`;
    const expected = await hmacHex(signingSecret(), payload);
    const signatureValid = !!cert.signature && timingSafeEqual(expected, cert.signature);

    const expired = cert.expires_at ? new Date(cert.expires_at) < new Date() : false;
    const valid = signatureValid && !cert.revoked && !expired;

    await svc.from("certificate_verifications").insert({
      certificate_id: cert.id,
      verified_at: new Date().toISOString(),
    });

    return json(req, {
      valid,
      reason: !signatureValid
        ? "signature_mismatch"
        : cert.revoked
        ? "revoked"
        : expired
        ? "expired"
        : "ok",
      certificate: {
        id: cert.id,
        verificationCode: cert.verification_code,
        holderName: cert.holder_name,
        cefrLevel: cert.cefr_level,
        functionalLabel: cert.functional_label,
        overallScore: cert.overall_score,
        issuedAt: cert.issued_at,
        expiresAt: cert.expires_at,
      },
      disclaimer:
        "This assessment is not accredited by any government or educational accreditation body. It is an independent proficiency assessment.",
    });
  } catch (e) {
    console.error("verify-certificate error:", (e as Error).message);
    return json(req, { valid: false, error: "Verification unavailable" }, 500);
  }
});
