// Legacy content cache — stubbed for new schema
// Will be replaced with item_bank queries

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

const CERT_CONTENT_VERSION = 'v2-gemini';

export async function getCachedContent(
  section: string, level: string, language: string = 'english',
  version: string = CERT_CONTENT_VERSION, excludeHashes: string[] = []
): Promise<PoolItem | null> {
  console.log(`[stub] getCachedContent ${section}/${level}/${language}`);
  return null;
}

export async function cacheContent(
  section: string, level: string, language: string,
  version: string, payload: any, generationCost: number = 0, stemHash?: string
): Promise<string | null> {
  console.log(`[stub] cacheContent ${section}/${level}/${language}`);
  return null;
}

export async function trackContentUsage(
  testSessionId: string, poolId: string, section: string, stemHash?: string | null
): Promise<void> {}

export async function trackCacheEvent(
  section: string, level: string, language: string,
  version: string, cacheHit: boolean, testSessionId?: string
): Promise<void> {}

export async function getOrCreatePoolItem(
  section: string, level: string, language: string = 'english',
  version: string = CERT_CONTENT_VERSION, testSessionId?: string, excludeHashes: string[] = []
): Promise<PoolItem | null> {
  return null;
}

export async function getCacheStats() {
  return { totalItems: 0, totalUsage: 0, hitRate: 0, hits: 0, misses: 0 };
}

export { CERT_CONTENT_VERSION };
