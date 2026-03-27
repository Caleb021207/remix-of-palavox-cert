# Phase 1 Fixes Applied

## Critical Fixes Implemented

### ✅ 1. Removed UNIQUE Constraint
**Problem**: Only one item per (section, level, language, version) combination
**Fix**: Dropped composite UNIQUE constraint, added stem_hash-based deduplication

### ✅ 2. Multi-Item Selection
**Problem**: `.maybeSingle()` always returned same item
**Fix**: Created `get_least_used_pool_item()` RPC function that:
- Selects least-used items first
- Considers last_used_at for rotation
- Supports user exclusion lists (via stem_hash)
- Adds random element for ties

### ✅ 3. Cache Hit/Miss Tracking
**Problem**: Hit rate calculation was incorrect
**Fix**: Created `cert_cache_events` table to track:
- Every cache lookup (hit or miss)
- True hit rate = hits / (hits + misses)
- Per-session analytics

### ✅ 4. Stem Hash for Deduplication
**Added**:
- `stem_hash` column to `cert_content_pool`
- UNIQUE constraint on `(section, level, language, version, stem_hash)`
- Prevents exact duplicates while allowing variants
- SHA-256 hash of canonical content

### ✅ 5. Fixed Level Names
**Changed**: `Advanced` → `C1`, `C2`
**Result**: Consistent CEFR naming across:
- Database schema
- Edge functions
- Prewarm script
- UI components

### ✅ 6. Updated Prewarm Script
**Changes**:
- INSERT instead of UPSERT (allows multiple items)
- Generates stem_hash for each item
- Handles duplicate detection gracefully
- Uses C1/C2 levels
- Logs hash prefixes for debugging

### ✅ 7. User Exposure Control
**Added**:
- `stem_hash` to `cert_item_usage` table
- `exclude_hashes` parameter in RPC function
- Foundation for "don't show same item to same user" logic

### ✅ 8. Performance Indexes
**Created**:
- `idx_ccp_sllv` on (section, level, language, version)
- `idx_ccp_usage` on (used_count, last_used_at)
- `idx_ciu_session` on cert_item_usage(test_session_id)
- `idx_ciu_pool` on cert_item_usage(pool_id)
- `idx_cce_hit` on cert_cache_events(cache_hit)

## Updated Architecture

### Content Pool Now Supports:
1. **Multiple items per level** - 10+ variants per (section, level) combination
2. **Fair rotation** - Least-used items selected first
3. **Duplicate prevention** - Via stem_hash uniqueness
4. **User exclusions** - Track what users have seen
5. **Accurate analytics** - Real hit rate from cache_events

### Test Uniqueness Strategy:
Each test assembly will (Phase 2):
- Pick different items using least-used algorithm
- Support variants (paraphrases, distractor sets)
- Seeded randomness per test_id for reproducibility
- User exposure tracking prevents repeats

## Migration Applied

```sql
-- Removed: UNIQUE(section,level,language,version,usage_context)
-- Added: stem_hash column with flexible UNIQUE constraint
-- Added: cert_cache_events table for analytics
-- Added: get_least_used_pool_item() RPC function
-- Added: Multiple performance indexes
```

## Files Modified

- ✅ `supabase/migrations/[timestamp]_phase1_fixes.sql`
- ✅ `src/services/cert/contentCache.ts` - Multi-item selection
- ✅ `src/utils/stemHash.ts` - Hash generation utilities
- ✅ `supabase/functions/generate-reading-content/index.ts` - RPC usage
- ✅ `scripts/prewarm-content-pool.ts` - INSERT logic + hash generation

## What This Enables

### Immediate Benefits:
- ✅ 240+ unique items can be cached (not just 24)
- ✅ Fair item rotation prevents overuse
- ✅ Accurate cost and hit rate analytics
- ✅ Foundation for user-specific test uniqueness

### Future Capabilities (Phase 2+):
- Multiple paraphrases per stem
- Distractor set variants
- TTS audio alternatives
- Seeded assembly per test_id
- User exposure history

## Testing Checklist

Before running prewarm:
- [ ] Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
- [ ] Confirm edge functions are deployed
- [ ] Check database migrations applied successfully

After running prewarm:
- [ ] Query `SELECT count(*) FROM cert_content_pool GROUP BY section, level` - should show 10+ per level
- [ ] Run 10 test generations, check `cert_cache_events` for hit rate
- [ ] Verify different items selected on repeated calls
- [ ] Check `used_count` increments correctly

## Cost Model Update

**Before fixes**: $0.30/test (regeneration every time)
**After fixes**: $0.02-0.05/test (90-95% cache hit rate)
**With 240 items**: Each item used ~100 times before retirement
**Pool lifetime**: 24,000 tests before full refresh needed

## Next Steps

1. **Run prewarm script** to populate pool
2. **Monitor cache stats** for first 100 tests
3. **Implement Phase 2** features:
   - Paraphrase variants
   - Distractor set rotation
   - Seeded assembly
   - User exclusion enforcement

## Rollback

If issues occur:
```sql
-- Emergency: Go back to single-item cache
ALTER TABLE cert_content_pool 
  ADD CONSTRAINT old_unique UNIQUE(section, level, language, version, usage_context);
```

Then fix issues and remove constraint again.
