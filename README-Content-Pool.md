# Content Pool Pre-Generation System

## Overview

The content pool system allows you to pre-generate test questions for all supported languages, ensuring fast test delivery with >90% cache hit rates.

## Supported Languages

- Spanish, French, German, Italian, Portuguese
- Russian, Ukrainian
- Chinese, Japanese, Korean
- Hindi, Vietnamese, Indonesian
- Arabic, Persian, Urdu, Pashto, Swahili

## Sections & Levels

### Sections
- Reading Comprehension
- Listening Comprehension
- Writing Prompts
- Speaking Prompts

### CEFR Levels
- A1 (Beginner)
- A2 (Elementary)
- B1 (Intermediate)
- B2 (Upper Intermediate)
- C1 (Advanced)
- C2 (Proficient)

## Pre-warming the Pool

### Method 1: Using the CLI Script

```bash
# From the project root
bun run scripts/prewarm-content-pool.ts
```

This will:
- Generate 10 items per language/section/level combination
- Skip combinations that already have enough items
- Show progress and summary statistics

### Method 2: Using the API

```typescript
import { prewarmContentPool } from '@/services/admin/prewarmPool';

// Generate with default settings (10 items per combo)
await prewarmContentPool();

// Dry run to see what would be generated
await prewarmContentPool({ dryRun: true });

// Custom target
await prewarmContentPool({ targetItems: 20 });
```

### Method 3: Direct Edge Function Call

```bash
curl -X POST https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/prewarm-pool \
  -H "Content-Type: application/json" \
  -d '{"targetItems": 10, "dryRun": false}'
```

## Monitoring Pool Stats

```typescript
import { getPoolStats } from '@/services/admin/prewarmPool';

const stats = await getPoolStats();
console.log(`Total items: ${stats.total}`);
console.log(`By section:`, stats.bySection);
```

## How It Works

1. **Atomic Claims**: Each test session claims the least-used item from the pool using `claim_least_used_pool_item()`
2. **Automatic Tracking**: Usage counts are automatically incremented to ensure fair rotation
3. **Deduplication**: Content is hashed using `stem_hash` to prevent duplicates
4. **Fallback Generation**: If pool is empty, content is generated on-demand and cached

## Database Tables

### cert_content_pool
Stores all pre-generated content:
- `section`: reading, listening, writing, speaking
- `level`: A1-C2
- `language`: lowercase language name
- `version`: content version (currently 'v1-gpt4o-mini')
- `payload`: the actual content (JSON)
- `used_count`: how many times this item has been used
- `last_used_at`: timestamp of last usage
- `stem_hash`: SHA-256 hash for deduplication

### cert_cache_events
Tracks cache hits/misses for monitoring:
- `section`, `level`, `language`, `version`
- `cache_hit`: true if served from pool, false if generated
- `test_session_id`: links to the test session

### cert_item_usage
Links pool items to test sessions:
- `test_session_id`: which test used this item
- `pool_id`: which pool item was used
- `section`: which section it was for

## Cost Estimation

- ~18 languages × 4 sections × 6 levels × 10 items = 4,320 items
- At $0.03 per item = ~$130 to fully populate
- Subsequent tests use cached content at no generation cost

## Best Practices

1. **Pre-warm during off-peak hours** to avoid rate limits
2. **Monitor cache hit rates** using `cert_cache_events`
3. **Regenerate monthly** to keep content fresh
4. **Set targetItems=20** for high-volume languages (Spanish, Chinese, French)
5. **Use dry run first** to see what will be generated

## Troubleshooting

### Rate Limit Errors (429)
- The system includes 1-second delays between generations
- Reduce batch size or run during off-peak hours

### Duplicate Content
- The stem_hash prevents exact duplicates
- If you see "Duplicate detected" messages, it's working correctly

### Missing Content for Language
- Check that the language is in the LANGUAGES array in `prewarm-pool/index.ts`
- Verify edge functions exist for all sections (reading, listening, writing, speaking)

## Maintenance

### Check Pool Health
```sql
SELECT 
  section,
  level,
  language,
  COUNT(*) as items,
  AVG(used_count) as avg_usage,
  MAX(used_count) as max_usage
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini'
GROUP BY section, level, language
ORDER BY section, level, language;
```

### Find Underutilized Items
```sql
SELECT section, level, language, used_count
FROM cert_content_pool
WHERE version = 'v1-gpt4o-mini' 
  AND used_count = 0
ORDER BY created_at DESC
LIMIT 20;
```

### Clear Old Versions
```sql
DELETE FROM cert_content_pool
WHERE version != 'v1-gpt4o-mini';
```
