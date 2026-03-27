# Phase 1 Operations Runbook

## Overview
Phase 1 implements a race-safe content pool system with atomic claiming to achieve >90% cache hit rate and prevent duplicate content serving under concurrency.

## Architecture

### Content Pool (`cert_content_pool`)
- Stores pre-generated test content for all sections and levels
- Uses `FOR UPDATE SKIP LOCKED` for race-safe atomic claiming
- Tracks usage counts and last-used timestamps for fair distribution

### Key Components
1. **Atomic Claim RPC** (`claim_least_used_pool_item`): Selects and increments in one transaction
2. **Usage Tracking** (`cert_item_usage`): Records which items were used in which tests
3. **Cache Events** (`cert_cache_events`): Tracks hit/miss rates for monitoring
4. **Metrics** (`cert_metrics`): Tracks LLM tokens, TTS characters, STT seconds, costs

## Content Versioning

### Current Version: `v1-gpt4o-mini`
- Generation: GPT-4o-mini
- Grading: GPT-4o-mini
- TTS: tts-1 (standard quality)
- STT: whisper-1

### Blue/Green Deployments
To roll out a new version (e.g., GPT-5 for grading):

1. **Prewarm new version**:
   ```bash
   CERT_CONTENT_VERSION=v2-gpt5-grading npm run prewarm
   ```

2. **Update edge functions** to use new version:
   ```typescript
   const CERT_CONTENT_VERSION = 'v2-gpt5-grading';
   ```

3. **Monitor hit rates** for new version

4. **Rollback if needed**: Change version constant back

No database changes required - just version string updates!

## Prewarming the Pool

### Prerequisites
```bash
export VITE_SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key
export OPENAI_API_KEY=your_key
export AZURE_SPEECH_KEY=your_key
```

### Run Prewarm Script
```bash
npm run prewarm
# or
bun run scripts/prewarm-content-pool.ts
```

### Target Metrics
- **Items**: ≥240 (4 sections × 6 levels × 10 items)
- **Success Rate**: ≥90%
- **Time**: ~20-30 minutes (with rate limiting)
- **Cost**: ~$7.20 (240 items × $0.03 avg)

### Monitoring Prewarm
Watch for:
- ✅ `Cache hit` logs (means duplicates are being caught)
- ❌ Failed generations (retry these manually)
- Hash collisions (expected, means deduplication works)

## Verification Queries

### Daily Hit Rate
```sql
SELECT
  DATE(created_at) AS day,
  COUNT(*) FILTER (WHERE cache_hit) AS hits,
  COUNT(*) FILTER (WHERE NOT cache_hit) AS misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit) / COUNT(*), 2) AS hit_rate
FROM cert_cache_events
GROUP BY 1
ORDER BY 1 DESC;
```

**Target**: ≥90% hit rate after prewarm

### Pool Health by Section/Level
```sql
SELECT 
  section, 
  level, 
  COUNT(*) items, 
  MIN(used_count) min_use, 
  ROUND(AVG(used_count), 1) avg_use, 
  MAX(used_count) max_use
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
GROUP BY 1, 2
ORDER BY 1, 2;
```

**What to check**:
- Each section/level has ≥10 items
- `max_use / min_use` ratio < 3 (even distribution)
- No items with 0 count (all getting used)

### Hot Items (Watch for Overuse)
```sql
SELECT 
  id, 
  section, 
  level, 
  used_count, 
  last_used_at,
  stem_hash
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
ORDER BY used_count DESC
LIMIT 20;
```

**Red flags**:
- One item used 10x more than average (indicates pool too small)
- Recent items not being used (indicates claim RPC not working)

### Cost per Test (Certification)
```sql
SELECT 
  test_session_id,
  model_gen,
  model_grade,
  llm_tokens_in + llm_tokens_out AS total_tokens,
  tts_characters,
  stt_seconds,
  realtime_seconds,
  estimated_cost_usd
FROM cert_metrics
WHERE test_session_id IN (
  SELECT id FROM test_sessions 
  WHERE test_type = 'certification' 
  ORDER BY created_at DESC 
  LIMIT 100
)
ORDER BY estimated_cost_usd DESC;
```

**Targets** (with 90% cache hit):
- **Cached test**: $0.10-0.20 (grading only)
- **Cache miss test**: $0.50-0.80 (generation + grading)
- **Average**: $0.15-0.25

### Missing Items (Gaps in Pool)
```sql
WITH expected AS (
  SELECT 
    s.section, 
    l.level
  FROM (VALUES ('reading'), ('listening'), ('writing'), ('speaking')) s(section)
  CROSS JOIN (VALUES ('A1'), ('A2'), ('B1'), ('B2'), ('C1'), ('C2')) l(level)
),
actual AS (
  SELECT DISTINCT section, level
  FROM cert_content_pool
  WHERE version = 'v1-gpt4o-mini'
)
SELECT e.section, e.level
FROM expected e
LEFT JOIN actual a ON e.section = a.section AND e.level = a.level
WHERE a.section IS NULL;
```

**Should return 0 rows** after successful prewarm

## Load Testing

### Quick Parallel Test (20 concurrent)
```bash
for i in {1..20}; do
  curl -X POST https://your-project.supabase.co/functions/v1/generate-reading-content \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"targetLanguage":"english","baseLanguage":"spanish","sessionId":"load-test-'$i'"}' &
done
wait
```

### Verify No Duplicates in Burst
```sql
SELECT pool_id, COUNT(*) 
FROM cert_item_usage 
WHERE test_session_id LIKE 'load-test-%'
  AND used_at > NOW() - INTERVAL '1 minute'
GROUP BY 1
HAVING COUNT(*) > 1;
```

**Should return 0 rows** (atomic claim prevents duplicates)

## Troubleshooting

### Low Hit Rate (<80%)
**Cause**: Pool not prewarmed or version mismatch

**Fix**:
1. Check version in edge functions matches pool version
2. Run prewarm script again
3. Check for errors in edge function logs

### Skewed Usage (Some Items Used 10x More)
**Cause**: Pool too small or claim RPC not randomizing

**Fix**:
1. Increase `ITEMS_PER_LEVEL` in prewarm script
2. Check claim RPC includes `RANDOM()` in ORDER BY

### Duplicate Items Served (Race Condition)
**Cause**: Not using atomic claim RPC

**Fix**:
1. Verify all edge functions call `claim_least_used_pool_item`
2. Check no manual `increment_pool_usage` calls
3. Verify `FOR UPDATE SKIP LOCKED` in RPC

### High Costs per Test
**Cause**: Cache misses or inefficient generation

**Fix**:
1. Check hit rate (should be >90%)
2. Verify generation uses `gpt-4o-mini` not `gpt-4`
3. Check token counts in `cert_metrics`

## Rollback Plan

### Emergency: Bypass Pool (Force Generation)
1. Set env var in edge functions:
   ```typescript
   const BYPASS_POOL = Deno.env.get('BYPASS_POOL') === 'true';
   if (BYPASS_POOL) {
     // skip cache claim, go straight to generation
   }
   ```

2. Update Supabase secrets:
   ```bash
   supabase secrets set BYPASS_POOL=true
   ```

### Rollback to Previous Version
1. Change version constant in edge functions:
   ```typescript
   const CERT_CONTENT_VERSION = 'v1-gpt4o-mini'; // back to stable
   ```

2. Redeploy functions (automatic on push)

No database changes needed!

## Monitoring Checklist (Daily)

- [ ] Hit rate ≥90% (query: Daily Hit Rate)
- [ ] Pool health: all sections/levels ≥10 items
- [ ] No hot items (max/avg ratio < 3)
- [ ] Average test cost < $0.30
- [ ] No missing items (query: Missing Items)
- [ ] Edge function logs: no errors

## Next Steps (Phase 2)

1. **Per-user exposure control**: Track stem_hash per user, exclude seen items
2. **GPT-5 grading**: Update grading to use `gpt-5-mini-2025-08-07`
3. **Audio upgrades**: 
   - Listening TTS: `tts-1-hd`
   - Speaking STT: `gpt-4o-transcribe`
4. **Admin dashboard**: Visual pool health monitoring
5. **Auto-prewarm**: Cron job to maintain pool at ≥10 items per level

## Support

**Logs**: 
- Edge Functions: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/functions
- Database: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/logs/postgres-logs

**Tables**:
- Pool: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/editor/cert_content_pool
- Usage: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/editor/cert_item_usage
- Events: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/editor/cert_cache_events
- Metrics: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/editor/cert_metrics
