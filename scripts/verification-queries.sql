-- ============================================
-- Phase 1 Verification Queries
-- Run these to verify pool health and performance
-- ============================================

-- 1. Daily Hit Rate (Target: ≥90%)
-- Shows cache hit rate by day
SELECT
  DATE(created_at) AS day,
  COUNT(*) FILTER (WHERE cache_hit) AS hits,
  COUNT(*) FILTER (WHERE NOT cache_hit) AS misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit) / COUNT(*), 2) AS hit_rate_pct
FROM cert_cache_events
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;

-- 2. Pool Health by Section/Level
-- Check each section×level has ≥10 items and even distribution
SELECT 
  section, 
  level, 
  COUNT(*) AS items, 
  MIN(used_count) AS min_use, 
  ROUND(AVG(used_count), 1) AS avg_use, 
  MAX(used_count) AS max_use,
  ROUND(MAX(used_count)::numeric / NULLIF(AVG(used_count), 0), 2) AS skew_ratio
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
GROUP BY 1, 2
ORDER BY 1, 2;

-- 3. Hot Items (Watch for Overuse)
-- Items used significantly more than average indicate pool too small
SELECT 
  id, 
  section, 
  level, 
  used_count, 
  last_used_at,
  LEFT(stem_hash, 8) AS hash_prefix
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
ORDER BY used_count DESC
LIMIT 20;

-- 4. Cost per Test (Certification)
-- Target: $0.15-0.25 average with 90% cache hit
SELECT 
  test_session_id,
  model_gen,
  model_grade,
  llm_tokens_in + llm_tokens_out AS total_tokens,
  tts_characters,
  stt_seconds,
  realtime_seconds,
  ROUND(estimated_cost_usd::numeric, 4) AS cost_usd
FROM cert_metrics
WHERE test_session_id IN (
  SELECT id FROM test_sessions 
  WHERE test_type = 'certification'
    AND created_at > NOW() - INTERVAL '7 days'
  ORDER BY created_at DESC 
  LIMIT 100
)
ORDER BY estimated_cost_usd DESC
LIMIT 50;

-- 5. Average Cost per Test (Last 100)
SELECT 
  COUNT(*) AS test_count,
  ROUND(AVG(estimated_cost_usd)::numeric, 4) AS avg_cost_usd,
  ROUND(MIN(estimated_cost_usd)::numeric, 4) AS min_cost_usd,
  ROUND(MAX(estimated_cost_usd)::numeric, 4) AS max_cost_usd
FROM cert_metrics
WHERE test_session_id IN (
  SELECT id FROM test_sessions 
  WHERE test_type = 'certification'
    AND created_at > NOW() - INTERVAL '7 days'
);

-- 6. Missing Items (Gaps in Pool)
-- Should return 0 rows after successful prewarm
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
SELECT e.section, e.level, 'MISSING' AS status
FROM expected e
LEFT JOIN actual a ON e.section = a.section AND e.level = a.level
WHERE a.section IS NULL;

-- 7. Duplicate Items in Concurrent Burst
-- Verify atomic claim prevents race conditions (should return 0 rows)
-- Replace 'load-test-%' with your actual test session prefix
SELECT pool_id, COUNT(*) AS times_used
FROM cert_item_usage 
WHERE test_session_id LIKE 'load-test-%'
  AND used_at > NOW() - INTERVAL '5 minutes'
GROUP BY pool_id
HAVING COUNT(*) > 1;

-- 8. Pool Coverage Summary
-- Quick overview of pool status
SELECT 
  version,
  COUNT(DISTINCT section) AS sections,
  COUNT(DISTINCT level) AS levels,
  COUNT(*) AS total_items,
  SUM(used_count) AS total_uses,
  ROUND(AVG(used_count), 1) AS avg_uses_per_item
FROM cert_content_pool
GROUP BY version
ORDER BY version;

-- 9. Recent Cache Events (Last 100)
-- Monitor real-time cache performance
SELECT 
  section,
  level,
  language,
  cache_hit,
  test_session_id,
  created_at
FROM cert_cache_events
ORDER BY created_at DESC
LIMIT 100;

-- 10. Underused Items (Never or Rarely Used)
-- Items that haven't been claimed yet
SELECT 
  section,
  level,
  COUNT(*) AS unused_items
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
  AND used_count = 0
GROUP BY section, level
ORDER BY unused_items DESC;

-- 11. Pool Skew Alert (Items Used >3x More Than Average)
-- Indicates pool too small or poor distribution
WITH avg_usage AS (
  SELECT 
    section,
    level,
    AVG(used_count) AS avg_use
  FROM cert_content_pool
  WHERE version = 'v1-gpt4o-mini'
  GROUP BY section, level
)
SELECT 
  p.section,
  p.level,
  p.id,
  p.used_count,
  ROUND(a.avg_use, 1) AS section_avg,
  ROUND(p.used_count / NULLIF(a.avg_use, 0), 2) AS times_above_avg
FROM cert_content_pool p
JOIN avg_usage a ON p.section = a.section AND p.level = a.level
WHERE p.version = 'v1-gpt4o-mini'
  AND p.used_count > a.avg_use * 3
ORDER BY times_above_avg DESC;

-- 12. Generation Cost Summary
-- Track total generation investment
SELECT 
  version,
  SUM(generation_cost_usd) AS total_generation_cost,
  COUNT(*) AS items_generated,
  ROUND(AVG(generation_cost_usd)::numeric, 4) AS avg_cost_per_item
FROM cert_content_pool
GROUP BY version
ORDER BY version;
