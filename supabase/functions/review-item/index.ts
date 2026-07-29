// Admin-only item review: status transitions and stem/option edits.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { preflight, json } from "../_shared/cors.ts";
import { getUser, hasRole, serviceClient } from "../_shared/auth.ts";

const ALLOWED = ["draft", "gated", "trial", "operational", "retired"];

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const user = await getUser(req);
  if (!user) return json(req, { error: "Unauthorized" }, 401);
  if (!(await hasRole(user.id, "admin"))) return json(req, { error: "Forbidden" }, 403);

  try {
    const { item_id, status, stem, options } = await req.json();
    if (!item_id || typeof item_id !== "string") {
      return json(req, { error: "item_id is required" }, 400);
    }
    if (status && !ALLOWED.includes(status)) {
      return json(req, { error: "invalid status" }, 400);
    }

    const svc = serviceClient();
    const patch: Record<string, unknown> = {};
    if (status) patch.status = status;
    if (typeof stem === "string" && stem.trim()) patch.stem = stem.trim();

    if (Object.keys(patch).length) {
      const { error } = await svc.from("items").update(patch).eq("id", item_id);
      if (error) throw error;
    }

    if (Array.isArray(options)) {
      for (const o of options) {
        if (!o?.id) continue;
        const optPatch: Record<string, unknown> = {};
        if (typeof o.label === "string") optPatch.label = o.label;
        if (typeof o.rationale === "string") optPatch.rationale = o.rationale;
        if (typeof o.is_correct === "boolean") optPatch.is_correct = o.is_correct;
        if (Object.keys(optPatch).length) {
          await svc.from("item_options").update(optPatch).eq("id", o.id).eq("item_id", item_id);
        }
      }
    }

    return json(req, { ok: true });
  } catch (e) {
    console.error("review-item failed", e);
    return json(req, { error: (e as Error).message }, 500);
  }
});
