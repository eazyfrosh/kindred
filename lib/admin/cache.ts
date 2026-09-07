import 'server-only';

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Small in-process TTL memo for dashboard analytics.
 *
 * Aggregate counters change slowly relative to how often an administrator
 * reloads the dashboard, so a short window avoids repeating a dozen Firestore
 * aggregate queries on every navigation without ever serving stale writes for
 * long. Mutations do not depend on it.
 */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  store.set(key, { value, expires: Date.now() + ttlMs });
  if (store.size > 200) for (const [k, v] of store) if (v.expires < Date.now()) store.delete(k);
  return value;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) return store.clear();
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
