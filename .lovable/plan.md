

# Palavox Cert English — Full Rebuild Plan

## Summary

Rebuild the project as a **CEFR-aligned English proficiency screening certificate** using **Lovable + Supabase + Gemini** as the sole stack. Strip out OpenAI, Azure Speech, AWS Polly, and ElevenLabs dependencies. Price point: $5.99/test.

## Product positioning

> "AI-scored English proficiency screening and placement certificate aligned to CEFR and informed by ACTFL-style skill descriptors."

Not official ACTFL certification. Not TOEFL-equivalent. A fast, credible, shareable placement result.

## Core exam structure

| Section | Format | Items | Scoring |
|---------|--------|-------|---------|
| Reading | Multistage adaptive (3 routed modules) | 15 MCQ | Deterministic, item-difficulty-weighted |
| Listening | Multistage adaptive, Gemini TTS audio | 15 MCQ | Deterministic, item-difficulty-weighted |
| Writing | 1 practical + 1 extended response | 2 prompts | Dual-pass Gemini rubric scoring |
| Speaking | Read-aloud + short + situational response | 3 prompts | Gemini audio analysis, dual-pass |
| Live conversation | Optional/experimental | 90s–2min | Not part of core certificate in v1 |

**Total seat time:** ~28–38 minutes.

---

## Phase 1 — Foundation (Database + Auth + Payments)

### 1A. Supabase schema

Create all core tables with RLS:

- `profiles`, `organizations`, `organization_members`
- `test_products`, `purchases`, `voucher_codes`
- `test_sessions`, `test_attempts`, `test_sections`
- `item_bank`, `item_variants`, `item_audio_assets`, `item_answer_keys`
- `writing_prompts`, `speaking_prompts`
- `responses_mcq`, `responses_writing`, `responses_speaking`
- `scores_section`, `scores_overall`, `score_audits`
- `certificates`, `certificate_verifications`
- `consent_records`, `fraud_flags`, `event_logs`
- `user_roles` (enum: admin, moderator, user) — security-definer `has_role()` function

Storage buckets: `speaking-audio`, `listening-audio`, `certificate-pdfs`, `rubric-anchors`

### 1B. Auth

Use Supabase Auth (email/password + magic link). Keep the existing `AuthModal` pattern but simplify.

### 1C. Stripe integration

Enable Stripe via Lovable's Stripe tool. Create:
- Product: "Palavox Cert English" at $5.99
- Edge functions: `create-checkout-session`, `stripe-webhook`, `redeem-voucher`

### 1D. Secrets

Required secrets (via Lovable secure secrets):
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CERTIFICATE_SIGNING_SECRET`

Remove: `OPENAI_API_KEY` dependency from all edge functions.

---

## Phase 2 — Test Engine

### 2A. Item bank + adaptive routing

- Seed ~400–800 reviewed items with metadata (difficulty, topic, grammar target, CEFR band, bias flag)
- Edge function: `get-next-module` — routes candidates through Foundation → Functional → Professional modules based on prior module performance
- Edge functions: `start-section`, `submit-mcq-response`

### 2B. Reading section

- 15 questions, 3 routed modules of 5
- Pull from `item_bank` with diversity constraints
- Deterministic scoring

### 2C. Listening section

- 15 questions, same routing
- Audio generated via Gemini TTS, versioned and locked in `listening-audio` bucket
- Edge function: `generate-listening-audio` (Gemini TTS)

### 2D. Writing section

- 2 prompts (practical + extended)
- Edge function: `score-writing` — calls Gemini twice (score pass + audit pass)
- Structured output schema enforcing: `rubric_scores`, `predicted_cefr`, `evidence_quotes`, `error_tags`, `confidence`, `human_review_recommended`, `fraud_flags`

### 2E. Speaking section

- 3 recorded prompts
- Audio uploaded to `speaking-audio` bucket
- Edge function: `score-speaking` — Gemini audio analysis, dual-pass
- Scoring weights: intelligibility > fluency > lexical/grammatical control > relevance > discourse development. Pronunciation/accent is one small sub-feature only.

### 2F. Score finalization

- Edge function: `finalize-test`
- Section scores → overall CEFR band
- Floor rules: no section below B1 for Professional certificate
- Confidence band: "B1 high confidence" or "borderline B1/B2"
- `run-score-audit` for borderline/suspicious cases

---

## Phase 3 — Output + Polish

### 3A. Results page

- Overall level (A2/B1/B2/C1)
- Functional label (Basic/Functional/Professional/Advanced Professional)
- Subscores per section
- Confidence band
- 3 strengths + 3 next steps
- Retake recommendation

### 3B. Certificate generation

- Edge function: `generate-certificate` → PDF in `certificate-pdfs` bucket
- Verification code + public verification URL
- Edge function: `verify-certificate`
- LinkedIn-ready badge graphic

### 3C. School/institutional dashboard

- Voucher codes / seat licenses
- Cohort analytics
- Placement recommendations
- CSV export
- Verified public score link

### 3D. Legal/compliance pages

- Privacy policy, terms of service (already exist — update language)
- Score disclaimer: "CEFR-aligned screening, not official ACTFL rating"
- Certificate disclaimer
- Parental consent flow (already exists — keep)

---

## Phase 4 — Cleanup

### What to remove

- All OpenAI direct API calls (`openAIService.ts`, `chat-completion`, `evaluate-response`, etc.)
- Azure Speech service (`azureSpeechService.ts`, `azure-speech` function)
- AWS Polly service (`awsPollyService.ts`, `aws-polly` function)
- ElevenLabs/voice agent (`voiceAgentService.ts`, `voice-agent`, `realtime-conversation`)
- Multi-language test configs (French, German, Italian, Portuguese, Spanish) — English only for v1
- Old question generation pipeline (replace with reviewed item bank + Gemini generation)
- `generate-questions`, `generate-comprehension-content`, `generate-batch`, `generate-all-content` — replace with simpler Gemini-based `seed-item-bank`

### What to keep/adapt

- React component structure (simplify)
- Supabase client integration
- Certificate PDF generation logic (adapt)
- UI translation system (keep for native-language UI)
- Test progress/timer components
- Auth flow

---

## Technical details

**Gemini integration pattern:** All Gemini calls go through Supabase Edge Functions using `GEMINI_API_KEY` stored as a secure secret. Use structured outputs (tool calling) for all scoring responses — never freeform prose scoring.

**Scoring stack:**
- Reading/Listening: deterministic, item-difficulty-weighted, no AI needed
- Writing/Speaking: Gemini dual-pass with structured JSON schema, disagreement threshold triggers third adjudication pass

**Anti-cheat (v1 basics):**
- Copy/paste monitoring on writing
- Response-time anomaly detection
- Voice consistency flags across speaking tasks

---

## Recommended build order

1. Schema + Auth + Stripe (get payments working)
2. Item bank seeding + Reading section
3. Listening section (Gemini TTS)
4. Writing section (Gemini scoring)
5. Speaking section (Gemini audio analysis)
6. Score finalization + Results page
7. Certificate generation + verification
8. School dashboard
9. Cleanup of old code
10. Live conversation (optional, Phase 5)

