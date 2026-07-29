import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthedUser {
  id: string;
  email?: string;
}

/** Service-role client. Never expose to the browser. */
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/**
 * Validates the caller's JWT in-code (never trust verify_jwt alone).
 * Returns null when the request is unauthenticated or the token is invalid.
 */
export async function getUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await anon.auth.getClaims(token);
  const claims = (data as { claims?: Record<string, unknown> } | null)?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub as string, email: claims.email as string | undefined };
}

/** True when the user holds the given role (checked server-side against user_roles). */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const svc = serviceClient();
  const { data } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  return !!data;
}

/** Confirms the session belongs to the caller (or the caller is an admin). */
export async function ownsSession(userId: string, sessionId: string) {
  const svc = serviceClient();
  const { data } = await svc
    .from("test_sessions")
    .select("id, user_id, status, metadata")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return { ok: false as const, session: null };
  if (data.user_id !== userId && !(await hasRole(userId, "admin"))) {
    return { ok: false as const, session: null };
  }
  return { ok: true as const, session: data };
}
