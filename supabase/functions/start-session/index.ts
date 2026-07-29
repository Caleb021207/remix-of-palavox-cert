import { preflight, json } from "../_shared/cors.ts";
import { getUser, serviceClient } from "../_shared/auth.ts";

/**
 * Creates a test session server-side. The browser can no longer insert
 * test_sessions rows, so this is the only way an attempt can begin.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const testType = typeof body.testType === "string" ? body.testType.slice(0, 64) : "certification";
    const language = typeof body.language === "string" ? body.language.slice(0, 64) : "english";
    const singlePhase = typeof body.singlePhase === "string" ? body.singlePhase.slice(0, 32) : null;

    const svc = serviceClient();
    const { data, error } = await svc
      .from("test_sessions")
      .insert({
        user_id: user.id,
        status: "in_progress",
        metadata: { test_type: testType, language, single_phase: singlePhase },
      })
      .select("id, started_at, expires_at")
      .single();

    if (error) {
      console.error("start-session insert failed:", error.message);
      return json(req, { error: "Could not start session" }, 500);
    }

    await svc.from("event_logs").insert({
      session_id: data.id,
      event_type: "session_started",
      payload: { test_type: testType, language, single_phase: singlePhase },
    });

    return json(req, { sessionId: data.id, startedAt: data.started_at, expiresAt: data.expires_at });
  } catch (e) {
    console.error("start-session error:", (e as Error).message);
    return json(req, { error: "Internal error" }, 500);
  }
});
