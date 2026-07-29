import { preflight, json } from "../_shared/cors.ts";
import { getUser, serviceClient, ownsSession } from "../_shared/auth.ts";
import { hmacHex, signingSecret } from "../_shared/grading.ts";

/**
 * Issues a signed, server-stored certificate for a finalized session.
 * The browser can never create or edit certificate rows.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);

    const { sessionId } = await req.json().catch(() => ({}));
    if (typeof sessionId !== "string") return json(req, { error: "sessionId required" }, 400);

    const { ok } = await ownsSession(user.id, sessionId);
    if (!ok) return json(req, { error: "Session not found" }, 404);

    const svc = serviceClient();

    // Already issued? Return it (idempotent).
    const { data: existing } = await svc
      .from("certificates")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (existing) {
      return json(req, { certificate: existing });
    }

    const { data: overall } = await svc
      .from("scores_overall")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!overall) {
      return json(req, { error: "Session has not been finalized yet" }, 409);
    }

    // Holder name: profile first, then auth metadata — never a placeholder.
    const { data: profile } = await svc
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    let holderName = (profile as { display_name?: string } | null)?.display_name ?? "";
    if (!holderName) {
      const { data: authUser } = await svc.auth.admin.getUserById(user.id);
      holderName =
        (authUser?.user?.user_metadata?.full_name as string) ||
        (authUser?.user?.user_metadata?.name as string) ||
        authUser?.user?.email ||
        "";
    }
    if (!holderName) {
      return json(req, { error: "Add your full name to your profile before issuing a certificate" }, 400);
    }

    const certId = crypto.randomUUID();
    const issuedAt = new Date().toISOString();
    const cefr = (overall as { overall_cefr: string }).overall_cefr;
    const label = (overall as { functional_label?: string }).functional_label ?? "";
    const score = (overall as { overall_score?: number }).overall_score ?? null;

    const payload = `${certId}|${user.id}|${sessionId}|${cefr}|${issuedAt}`;
    const signature = await hmacHex(signingSecret(), payload);
    const verificationCode = `PVX-${signature.slice(0, 12).toUpperCase()}`;

    const { data: cert, error } = await svc
      .from("certificates")
      .insert({
        id: certId,
        session_id: sessionId,
        user_id: user.id,
        verification_code: verificationCode,
        cefr_level: cefr,
        functional_label: label,
        holder_name: holderName,
        overall_score: score,
        signature,
        issued_at: issuedAt,
      })
      .select("*")
      .single();

    if (error) {
      console.error("issue-certificate insert failed:", error.message);
      return json(req, { error: "Could not issue certificate" }, 500);
    }

    return json(req, { certificate: cert });
  } catch (e) {
    console.error("issue-certificate error:", (e as Error).message);
    return json(req, { error: "Internal error" }, 500);
  }
});
