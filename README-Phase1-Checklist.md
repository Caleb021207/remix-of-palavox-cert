# Phase 1 Go/No-Go Checklist

## Pre-Launch Validation

### 1. Pool Coverage ✅
**Target**: Each section×level has ≥10 items for `v1-gpt4o-mini`

**Verify**:
```sql
-- Run: scripts/verification-queries.sql Query #2
-- Check: All 24 combinations (4 sections × 6 levels) have ≥10 items
```

**Pass Criteria**: 
- [ ] All 24 section×level combinations present
- [ ] Each has ≥10 items
- [ ] Total pool ≥240 items

---

### 2. Hit Rate & Collisions ✅
**Target**: ≥90% cache hit rate, 0 duplicate items under concurrency

**Verify**:
```bash
# Run 20 parallel requests
for i in {1..20}; do
  curl -X POST https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/generate-reading-content \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"targetLanguage":"english","baseLanguage":"spanish","sessionId":"load-test-'$i'"}' &
done
wait

# Check for duplicates (Query #7 from verification-queries.sql)
```

**Pass Criteria**:
- [ ] Daily hit rate ≥90% (Query #1)
- [ ] 0 rows from duplicate detection query
- [ ] No concurrent requests received same item ID

---

### 3. Usage Increments ✅
**Target**: `used_count` increases by exactly 1 per served item

**Verify**:
```sql
-- Before test: Note max used_count
SELECT MAX(used_count) FROM cert_content_pool WHERE version = 'v1-gpt4o-mini';

-- Run 10 tests

-- After test: Check increment
SELECT section, level, used_count 
FROM cert_content_pool 
WHERE version = 'v1-gpt4o-mini' 
  AND last_used_at > NOW() - INTERVAL '5 minutes'
ORDER BY last_used_at DESC;
```

**Pass Criteria**:
- [ ] Each served item: `used_count` +1
- [ ] No double-increments
- [ ] `last_used_at` updated correctly

**Code Verification**:
- [ ] No manual `increment_pool_usage` calls in edge functions
- [ ] All functions use `claim_least_used_pool_item` RPC

---

### 4. Pronunciation Removal ✅
**Target**: New tests exclude pronunciation; legacy tests show "Deprecated"

**Verify**:
- Start new certification test
- Check phase list in UI

**Pass Criteria**:
- [ ] New tests: Only 4 phases (Reading, Listening, Writing, Speaking)
- [ ] Legacy results (if any): Pronunciation shows "Deprecated (not factored)"
- [ ] Pronunciation excluded from score averaging

**Code Check**:
```typescript
// src/components/test/MultiPhaseTest.tsx line 56-61
const phases = [
  TestPhase.Reading,
  TestPhase.Listening,
  TestPhase.Writing,
  TestPhase.Speaking
]; // Should NOT include Pronunciation
```

---

### 5. Metering ✅
**Target**: `cert_metrics` captures all usage; costs computed from `pricing_config`

**Verify**:
```sql
-- Run Query #4 from verification-queries.sql
-- Check recent test has all metrics populated
```

**Pass Criteria**:
- [ ] `cert_metrics` row created for each test
- [ ] `llm_tokens_in` and `llm_tokens_out` > 0
- [ ] `tts_characters` > 0 (listening phase)
- [ ] `stt_seconds` > 0 (speaking phase)
- [ ] `estimated_cost_usd` calculated correctly
- [ ] `model_gen` and `model_grade` populated

**Code Check**:
- [ ] `useTestMetrics` hook called in all test phases
- [ ] Pricing pulled from `pricing_config` table (not hardcoded)

---

### 6. Ops Toggles ✅
**Target**: Environment-based feature flags and version control

**Verify**:
```bash
# Check edge function environment variables
supabase functions env list
```

**Pass Criteria**:
- [ ] `CERT_CONTENT_VERSION` set to `v1-gpt4o-mini` in all functions
- [ ] `BYPASS_POOL` toggle present (default: not set/false)
- [ ] Version respected in cache claim queries
- [ ] README-Phase1-Ops.md exists and complete

**Emergency Rollback Test**:
- [ ] Set `BYPASS_POOL=true` → forces generation-only mode
- [ ] Tests still work without pool
- [ ] Can revert by unsetting variable

---

### 7. Security & RLS ✅
**Target**: Proper access control on sensitive tables

**Verify**:
```sql
-- Check RLS on cert_cache_events
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'cert_cache_events';

-- Check RLS on cert_content_pool
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'cert_content_pool';
```

**Pass Criteria**:
- [ ] `cert_cache_events`: SELECT allowed, INSERT service-role only
- [ ] `cert_content_pool`: SELECT allowed, INSERT/UPDATE service-role only
- [ ] `cert_item_usage`: Proper RLS policies
- [ ] `cert_metrics`: Users can view own, service can manage
- [ ] No API keys in client code
- [ ] All secrets in Supabase edge function environment

---

## Micro-Fixes Verification

### Language Normalization ✅
**Verify**: All functions use `.toLowerCase()` consistently

**Check**:
- [ ] `generate-reading-content`: `contentLanguage.toLowerCase()`
- [ ] `generate-listening-content`: Language normalized
- [ ] `generate-writing-prompts`: `writingLanguage.toLowerCase()`
- [ ] `generate-speaking-prompts`: `targetLanguage.toLowerCase()`
- [ ] Prewarm script: Consistent casing

---

### CEFR Consistency ✅
**Verify**: No "Novice/Intermediate/Advanced" literals; all use A1-C2

**Check**:
- [ ] All edge functions: `A1, A2, B1, B2, C1, C2` only
- [ ] Prewarm script uses CEFR levels
- [ ] Database queries respect CEFR levels
- [ ] No old "Advanced" literals in new code

---

### Session Plumbing ✅
**Verify**: Client passes `sessionId` to all generators

**Check**:
```typescript
// In test service calls
const response = await supabase.functions.invoke('generate-reading-content', {
  body: {
    targetLanguage,
    baseLanguage,
    sessionId: testSessionId // ← Must be present
  }
});
```

**Pass Criteria**:
- [ ] Reading generator receives `sessionId`
- [ ] Listening generator receives `sessionId`
- [ ] Writing generator receives `sessionId`
- [ ] Speaking generator receives `sessionId`
- [ ] `sessionId` used for cache event tracking

---

### Stem Hash Consistency ✅
**Verify**: Hash uses correct content field per section

**Check**:
- [ ] Reading: `passage` text
- [ ] Listening: `prompt` text
- [ ] Writing: `prompt` text
- [ ] Speaking: `prompt` text
- [ ] All use SHA-256 with UTF-8 encoding
- [ ] Hash stored in `stem_hash` column

---

## Monitoring Dashboard (Quick Wins)

### Three Essential Queries ✅

**1. Hit Rate (Last 7 Days)**
```sql
-- Query #1 from verification-queries.sql
-- Alert if <90%
```

**2. Pool Skew Alert**
```sql
-- Query #11 from verification-queries.sql  
-- Alert if any item >3x average
```

**3. Average Cost/Test**
```sql
-- Query #5 from verification-queries.sql
-- Alert if >$0.30 (Phase 1 target: $0.15-0.25)
```

**Pass Criteria**:
- [ ] All 3 queries executable
- [ ] Results make sense
- [ ] Alerts defined for thresholds

---

## Load Testing (100 Sessions)

### Test Script
```bash
#!/bin/bash
# Run 100 parallel certification tests
for i in {1..100}; do
  # Trigger full certification test
  # (adjust endpoint as needed)
  curl -X POST https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/YOUR_TEST_ENDPOINT \
    -H "Authorization: Bearer YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"sessionId":"load-test-'$i'","targetLanguage":"english","baseLanguage":"spanish"}' \
    > /dev/null 2>&1 &
  
  if [ $((i % 10)) -eq 0 ]; then
    echo "Launched $i tests..."
  fi
done
wait
echo "All 100 tests completed."
```

### Validation After Load Test
```sql
-- Hit rate check
SELECT 
  COUNT(*) FILTER (WHERE cache_hit) AS hits,
  COUNT(*) FILTER (WHERE NOT cache_hit) AS misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit) / COUNT(*), 2) AS hit_rate
FROM cert_cache_events
WHERE created_at > NOW() - INTERVAL '10 minutes';

-- No duplicate items
SELECT pool_id, COUNT(*) 
FROM cert_item_usage
WHERE used_at > NOW() - INTERVAL '10 minutes'
GROUP BY pool_id
HAVING COUNT(*) > 1;

-- Usage increments
SELECT section, level, MIN(used_count), AVG(used_count), MAX(used_count)
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
GROUP BY section, level;
```

**Pass Criteria**:
- [ ] Hit rate ≥90%
- [ ] 0 duplicate items
- [ ] `used_count` incremented correctly
- [ ] No edge function errors
- [ ] Average cost per test $0.15-0.30

---

## Final Sign-Off

**Phase 1 Complete When All Checked** ✅

- [ ] **Pool coverage**: ≥240 items, all section×levels covered
- [ ] **Hit rate**: ≥90% cache hits
- [ ] **Concurrency**: 0 duplicate items under load
- [ ] **Metering**: All metrics captured correctly
- [ ] **Pronunciation**: Removed from new tests
- [ ] **Security**: RLS policies correct
- [ ] **Ops toggles**: `BYPASS_POOL` and version control working
- [ ] **Documentation**: Runbook complete
- [ ] **Load test**: 100 tests passed all checks

**Sign-off Date**: __________

**Notes**:
```
Any caveats, known issues, or items deferred to Phase 2:

```

---

## Post-Launch Monitoring (Daily)

**Week 1 Checklist** (check daily):
- [ ] Hit rate ≥90%
- [ ] Pool skew ratio <3
- [ ] Average test cost <$0.30
- [ ] No missing items
- [ ] Edge function logs clean
- [ ] No RLS violations

**Week 2+** (check weekly):
- [ ] Same as above
- [ ] Pool saturation: any items >50 uses?
- [ ] Cost trends stable
- [ ] User feedback positive

---

## Next: Phase 2 Planning

**Queued for Phase 2**:
1. **GPT-5 grading** (writing & speaking only) - Strict JSON schemas
2. **Audio upgrades**: Listening → `tts-1-hd`; Speaking → `gpt-4o-transcribe`
3. **Per-user exposure control**: Track and exclude seen stem_hash per user
4. **Auto-prewarm cron**: Maintain ≥10 items per bucket
5. **Admin dashboard**: Visual monitoring UI

**Phase 2 Kickoff**: When Phase 1 hits 95%+ hit rate for 7 consecutive days
