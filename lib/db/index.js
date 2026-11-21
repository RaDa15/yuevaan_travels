import path from 'path';
import { createAdminStore } from '../admin-store.js';
import { createPostgresStore } from './postgres-store.js';

const GLOBAL_STORE_CACHE_KEY = '__yuevaanDataStoreCache';
function getStoreCache() {
  if (!globalThis[GLOBAL_STORE_CACHE_KEY]) {
    globalThis[GLOBAL_STORE_CACHE_KEY] = new Map();
  }
  return globalThis[GLOBAL_STORE_CACHE_KEY];
}

export function createDataStore({ inquiriesDir, databaseUrl } = {}) {
  const dbUrl = String(databaseUrl !== undefined ? databaseUrl : process.env.DATABASE_URL || '').trim();
  const dir = path.resolve(/*turbopackIgnore: true*/ inquiriesDir || process.env.INQUIRIES_DIR || './.data');
  if (dbUrl) {
    return createPostgresStore({ databaseUrl: dbUrl, inquiriesDir: dir });
  }
  return createAdminStore({ inquiriesDir: dir });
}

export function getDefaultDataStore({ inquiriesDir, databaseUrl } = {}) {
  const storeCache = getStoreCache();
  const dbUrl = String(databaseUrl !== undefined ? databaseUrl : process.env.DATABASE_URL || '').trim();
  const dir = path.resolve(/*turbopackIgnore: true*/ inquiriesDir || process.env.INQUIRIES_DIR || './.data');
  const cacheKey = `${dbUrl}|${dir}`;
  if (!storeCache.has(cacheKey)) {
    storeCache.set(cacheKey, createDataStore({ inquiriesDir: dir, databaseUrl: dbUrl }));
  }
  return storeCache.get(cacheKey);
}
