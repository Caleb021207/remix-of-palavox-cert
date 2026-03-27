import { supabase } from '@/integrations/supabase/client';

export interface PoolItem {
  id: string;
  section: string;
  level: string;
  language: string;
  version: string;
  payload: any;
  usedCount: number;
  stemHash: string | null;
}

const CERT_CONTENT_VERSION = 'v1-gpt4o-mini';

/**
 * Get cached content - uses ATOMIC claim to prevent race conditions
 * @param excludeHashes - Array of stem_hashes to exclude (for user exposure control)
 */
export async function getCachedContent(
  section: string,
  level: string,
  language: string = 'english',
  version: string = CERT_CONTENT_VERSION,
  excludeHashes: string[] = []
): Promise<PoolItem | null> {
  try {
    // Use atomic claim RPC (selects + increments in one transaction)
    const { data, error } = await supabase
      .rpc('claim_least_used_pool_item', {
        p_section: section,
        p_level: level,
        p_language: language,
        p_version: version,
        p_exclude_hashes: excludeHashes
      });

    if (error) {
      console.error(`❌ Error claiming cached content:`, error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.log(`🔍 Cache miss for ${section}/${level}/${language}/${version}`);
      return null;
    }

    console.log(`✅ Cache hit for ${section}/${level}/${language} (used ${row.used_count} times)`);
    
    return {
      id: row.id,
      section: row.section,
      level: row.level,
      language: row.language,
      version: row.version,
      payload: row.payload,
      usedCount: row.used_count,
      stemHash: row.stem_hash ?? null
    };
  } catch (error) {
    console.error('Error in getCachedContent:', error);
    return null;
  }
}

/**
 * Store generated content in the pool
 * @param stemHash - Optional hash to prevent exact duplicates
 */
export async function cacheContent(
  section: string,
  level: string,
  language: string,
  version: string,
  payload: any,
  generationCost: number = 0,
  stemHash?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('cert_content_pool')
      .insert({
        section,
        level,
        language,
        version,
        payload,
        generation_cost_usd: generationCost,
        used_count: 0,
        usage_context: 'certification',
        stem_hash: stemHash
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error caching content:', error);
      return null;
    }

    console.log(`💾 Cached content: ${section}/${level}/${language}${stemHash ? ` (hash: ${stemHash.substring(0, 8)})` : ''}`);
    return data.id;
  } catch (error) {
    console.error('Error in cacheContent:', error);
    return null;
  }
}

/**
 * Track that a cached item was used in a test
 * NOTE: No need to call increment_pool_usage - the claim RPC already incremented
 */
export async function trackContentUsage(
  testSessionId: string,
  poolId: string,
  section: string,
  stemHash?: string | null
): Promise<void> {
  try {
    // Insert usage record (include stem_hash if available)
    const { error: insertError } = await supabase
      .from('cert_item_usage')
      .insert({
        test_session_id: testSessionId,
        pool_id: poolId,
        section,
        stem_hash: stemHash ?? null
      });

    if (insertError) {
      console.error('❌ Error tracking usage:', insertError);
    }

    // No need to call increment_pool_usage - the atomic claim already did it
  } catch (error) {
    console.error('Error in trackContentUsage:', error);
  }
}

/**
 * Track cache hit or miss for analytics
 */
export async function trackCacheEvent(
  section: string,
  level: string,
  language: string,
  version: string,
  cacheHit: boolean,
  testSessionId?: string
): Promise<void> {
  try {
    await supabase.from('cert_cache_events').insert({
      section,
      level,
      language,
      version,
      cache_hit: cacheHit,
      test_session_id: testSessionId
    });
  } catch (error) {
    console.error('Error tracking cache event:', error);
  }
}

/**
 * Get or create pool item - single entry point for all content generation
 */
export async function getOrCreatePoolItem(
  section: string,
  level: string,
  language: string = 'english',
  version: string = CERT_CONTENT_VERSION,
  testSessionId?: string,
  excludeHashes: string[] = []
): Promise<PoolItem | null> {
  // Try cache first
  const cached = await getCachedContent(section, level, language, version, excludeHashes);
  
  // Track cache event
  await trackCacheEvent(section, level, language, version, !!cached, testSessionId);
  
  if (cached) {
    return cached;
  }

  // Cache miss - caller should generate and cache
  console.log(`⚠️ No cached content available for ${section}/${level}/${language}`);
  return null;
}

/**
 * Get cache statistics - calculates actual hit rate from cache events
 */
export async function getCacheStats(): Promise<{
  totalItems: number;
  totalUsage: number;
  hitRate: number;
  hits: number;
  misses: number;
}> {
  try {
    const { data: poolData } = await supabase
      .from('cert_content_pool')
      .select('used_count');

    const totalItems = poolData?.length || 0;
    const totalUsage = poolData?.reduce((sum, item) => sum + (item.used_count || 0), 0) || 0;

    // Get actual hits and misses from cache events
    const { data: events } = await supabase
      .from('cert_cache_events')
      .select('cache_hit');

    const hits = events?.filter(e => e.cache_hit).length || 0;
    const misses = events?.filter(e => !e.cache_hit).length || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    return {
      totalItems,
      totalUsage,
      hitRate: Math.round(hitRate * 100) / 100,
      hits,
      misses
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalItems: 0, totalUsage: 0, hitRate: 0, hits: 0, misses: 0 };
  }
}

export { CERT_CONTENT_VERSION };
