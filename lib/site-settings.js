import { getDefaultDataStore } from './db/index.js';
import { mergeSiteConfigWithSettings } from './db/schema.js';

const CACHE_TTL_MS = 2000;
const GLOBAL_CACHE_KEY = '__yuevaanSiteConfigCache';

function getCacheStore() {
  if (!globalThis[GLOBAL_CACHE_KEY]) {
    globalThis[GLOBAL_CACHE_KEY] = { config: null, atMs: 0, key: '' };
  }
  return globalThis[GLOBAL_CACHE_KEY];
}

function currentStoreKey() {
  return `${process.env.DATABASE_URL || ''}|${process.env.INQUIRIES_DIR || './.data'}`;
}

export function invalidateSiteConfigCache() {
  const cache = getCacheStore();
  cache.config = null;
  cache.atMs = 0;
  cache.key = '';
}

export async function getLiveSiteConfig() {
  const cache = getCacheStore();
  const key = currentStoreKey();
  const now = Date.now();
  if (cache.config && cache.key === key && now - cache.atMs < CACHE_TTL_MS) {
    return cache.config;
  }
  try {
    const store = getDefaultDataStore();
    const stored = await store.getSiteSettingsAsync();
    cache.config = mergeSiteConfigWithSettings(stored);
    cache.atMs = now;
    cache.key = key;
    return cache.config;
  } catch {
    return mergeSiteConfigWithSettings(null);
  }
}
