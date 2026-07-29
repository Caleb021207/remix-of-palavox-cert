import { preflight, json } from "../_shared/cors.ts";
import { getUser, serviceClient, ownsSession } from "../_shared/auth.ts";

/**
 * Assembles a fixed practice form from the persistent item bank.
 *
 * Items are served WITHOUT answer keys: only option id, label and position
 * ever reach the browser. `item_options.is_correct` and `rationale` stay here.
 */

const LEVELS = [2, 3, 4, 5];
const TRIAL_COUNT = 3;

interface BankItem {
  id: string;
  skill: string;
  stem: string;
  format: string;
  passage_id: string | null;
  target_wida_level: number;
  cefr_level: string | null;
  topic: string | null;
  status: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const skill = body.skill === "listening" ? "listening" : "reading";
    if (!sessionId) return json(req, { error: "sessionId is required" }, 400);

    const { ok, session } = await ownsSession(user.id, sessionId);
    if (!ok || !session) return json(req, { error: "Session not found" }, 404);
    if (session.status === "completed") {
      return json(req, { error: "Session already finalized" }, 409);
    }

    const svc = serviceClient();

    // ── Blueprint ────────────────────────────────────────────────
    const { data: blueprint } = await svc
      .from("blueprints")
      .select("id, n_items, level_distribution")
      .eq("skill", skill)
      .eq("grade_band", "6-8")
      .maybeSingle();

    const distribution: Record<string, number> =
      (blueprint?.level_distribution as Record<string, number>) ?? { "2": 3, "3": 3, "4": 3, "5": 3 };

    // ── Candidate pool: operational first, gated as fallback ─────
    const { data: pool, error: poolErr } = await svc
      .from("items")
      .select("id, skill, stem, format, passage_id, target_wida_level, cefr_level, topic, status")
      .eq("skill", skill)
      .in("status", ["operational", "gated"])
      .in("target_wida_level", LEVELS)
      .order("exposure_count", { ascending: true })
      .limit(400);

    if (poolErr) throw new Error(poolErr.message);
    const items = (pool ?? []) as BankItem[];
    if (items.length === 0) return json(req, { error: "No items available for this skill" }, 409);

    const scored: BankItem[] = [];
    for (const level of LEVELS) {
      const want = Number(distribution[String(level)] ?? 3);
      const atLevel = items.filter((i) => i.target_wida_level === level);
      const operational = shuffle(atLevel.filter((i) => i.status === "operational"));
      const gated = shuffle(atLevel.filter((i) => i.status === "gated"));
      scored.push(...[...operational, ...gated].slice(0, want));
    }

    // Trial items: unscored, drawn from whatever is left over.
    const chosen = new Set(scored.map((i) => i.id));
    const trial = shuffle(items.filter((i) => !chosen.has(i.id))).slice(0, TRIAL_COUNT);
    const served = [...scored, ...trial];
    if (served.length === 0) return json(req, { error: "No items available for this skill" }, 409);

    // ── Persist the form ─────────────────────────────────────────
    const { data: form, error: formErr } = await svc
      .from("forms")
      .insert({
        blueprint_id: blueprint?.id ?? null,
        name: `${skill} practice ${new Date().toISOString().slice(0, 10)}`,
        status: "assembled",
      })
      .select("id")
      .single();
    if (formErr) throw new Error(formErr.message);

    const trialIds = new Set(trial.map((i) => i.id));
    const ordered = [...shuffle(scored), ...trial];
    const { error: fiErr } = await svc.from("form_items").insert(
      ordered.map((item, index) => ({
        form_id: form.id,
        item_id: item.id,
        position: index + 1,
        is_trial: trialIds.has(item.id),
      })),
    );
    if (fiErr) throw new Error(fiErr.message);

    // Exposure control
    await svc.rpc("bump_item_exposure", { _item_ids: ordered.map((i) => i.id) });

    // ── Options (answers stripped) ───────────────────────────────
    const { data: options } = await svc
      .from("item_options")
      .select("id, item_id, label, position")
      .in("item_id", ordered.map((i) => i.id))
      .order("position", { ascending: true });

    // ── Passages / audio ─────────────────────────────────────────
    const passageIds = [...new Set(ordered.map((i) => i.passage_id).filter(Boolean))] as string[];
    const { data: passages } = passageIds.length
      ? await svc
          .from("passages")
          .select("id, title, body, audio_asset_id, audio_status, target_wida_level")
          .in("id", passageIds)
      : { data: [] as never[] };

    const { data: audio } = await svc
      .from("item_audio_assets")
      .select("item_id, audio_url")
      .in("item_id", ordered.map((i) => i.id));

    const audioByItem = new Map((audio ?? []).map((a) => [a.item_id, a.audio_url]));
    const passageById = new Map((passages ?? []).map((p) => [p.id, p]));

    const payload = ordered.map((item, index) => {
      const passage = item.passage_id ? passageById.get(item.passage_id) : null;
      return {
        id: item.id,
        position: index + 1,
        stem: item.stem,
        format: item.format,
        skill: item.skill,
        cefrLevel: item.cefr_level,
        topic: item.topic,
        audioUrl: audioByItem.get(item.id) ?? null,
        passage: passage
          ? { id: passage.id, title: passage.title, body: passage.body, audioStatus: passage.audio_status }
          : null,
        options: (options ?? [])
          .filter((o) => o.item_id === item.id)
          .map((o) => ({ id: o.id, label: o.label, position: o.position })),
      };
    });

    await svc.from("event_logs").insert({
      session_id: sessionId,
      user_id: user.id,
      event_type: "form_assembled",
      payload: { skill, form_id: form.id, n_items: ordered.length, n_trial: trial.length } as never,
    });

    return json(req, {
      formId: form.id,
      skill,
      totalItems: payload.length,
      items: payload,
    });
  } catch (e) {
    console.error("assemble-form error:", (e as Error).message);
    return json(req, { error: "Could not assemble a practice form" }, 500);
  }
});
