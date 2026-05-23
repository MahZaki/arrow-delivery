import { API_URL } from '../constants';
import { Order, TrackingInfo } from '../types';
import { supabase } from '../lib/supabase';

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  BATCH_SIZE: 5,
  BATCH_DELAY: 800,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Statuses that mean "this order is done — archive it"
export const FINAL_STATUSES = new Set([
  'paye_et_archive',
  'payé_et_archivé',
  'retour_archive',
  'retour_archivé',
  'retour_recu',
  'retour_reçu',
  'annule',
  'annulé',
]);

// ============================================================================
// UTILS
// ============================================================================

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CONFIG.CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

// ============================================================================
// FETCH WITH RETRY
// ============================================================================

async function fetchWithRetry(url: string, retries = CONFIG.RETRY_ATTEMPTS): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : CONFIG.RETRY_DELAY * (i + 1);
        await wait(delay);
        continue;
      }

      if (response.status >= 500 && i < retries - 1) {
        await wait(CONFIG.RETRY_DELAY * (i + 1));
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await wait(CONFIG.RETRY_DELAY * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================================
// LIVE API — ACTIVE ORDERS
// ============================================================================

/**
 * Fetch ALL active orders from Ecotrack API (paginated).
 * Archived orders are NOT returned by this endpoint — that's by API design.
 */
export async function fetchOrdersFromApi(token: string): Promise<Order[]> {
  console.log('🚀 Fetching live orders from Ecotrack...');

  const cacheKey = `orders_${token}`;
  const cached = getCached<Order[]>(cacheKey);
  if (cached) {
    console.log('✅ Using cached data');
    return cached;
  }

  const startDate = '2018-01-01';
  const endDate = new Date().toISOString().split('T')[0];

  try {
    const firstUrl = `${API_URL}/api/v1/get/orders?api_token=${token}&start_date=${startDate}&end_date=${endDate}&page=1`;
    const firstResponse = await fetchWithRetry(firstUrl);
    if (!firstResponse.ok) throw new Error(`API returned ${firstResponse.status}`);

    const firstData = await firstResponse.json();
    const allOrders: Order[] = firstData.data || [];
    const totalPages = firstData.last_page || 1;

    console.log(`📊 ${firstData.total || 0} orders across ${totalPages} pages`);

    if (totalPages > 1) {
      const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

      for (let i = 0; i < pageNumbers.length; i += CONFIG.BATCH_SIZE) {
        const batch = pageNumbers.slice(i, i + CONFIG.BATCH_SIZE);
        const promises = batch.map(async (page) => {
          const url = `${API_URL}/api/v1/get/orders?api_token=${token}&start_date=${startDate}&end_date=${endDate}&page=${page}`;
          try {
            const res = await fetchWithRetry(url);
            if (!res.ok) return [];
            const d = await res.json();
            return d.data || [];
          } catch { return []; }
        });

        const results = await Promise.all(promises);
        results.forEach(orders => allOrders.push(...orders));

        if (i + CONFIG.BATCH_SIZE < pageNumbers.length) {
          await wait(CONFIG.BATCH_DELAY);
        }
      }
    }

    // Deduplicate
    const unique = Array.from(
      new Map(allOrders.map(o => [o.tracking, o])).values()
    );

    setCache(cacheKey, unique);
    console.log(`✅ ${unique.length} active orders loaded`);
    return unique;

  } catch (error: any) {
    console.error('❌ Failed to fetch orders:', error.message);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
}

// ============================================================================
// FILTER API — FETCH BY TRACKING NUMBERS
// Used for: manual import + auto-archive detection
// Response: { data: { TRACKING: { status, activity, ... } } }
// ============================================================================

export async function fetchOrdersByTrackings(
  trackings: string[],
  token: string,
  status: string = 'all'
): Promise<Order[]> {
  if (!trackings.length) return [];

  const results: Order[] = [];
  const batchSize = 50; // API max is 100 per request

  for (let i = 0; i < trackings.length; i += batchSize) {
    const batch = trackings.slice(i, i + batchSize);
    try {
      const url = `${API_URL}/api/v1/get/orders/status?api_token=${token}&trackings=${batch.join(',')}&status=${status}`;
      const response = await fetchWithRetry(url);
      if (!response.ok) continue;

      const data = await response.json();
      // Response shape: { data: { "TRACKING_NUM": { status, estimated_fee, activity, ... } } }
      if (data?.data) {
        Object.entries(data.data).forEach(([tracking, info]: [string, any]) => {
          // The filter API only returns: status, estimated_fee, order_id, desk_*, driver_phone, activity
          // It does NOT return: client, montant, wilaya_id — use estimated_fee as revenue fallback
          const montant = parseFloat(String(info.montant || info.estimated_fee || 0));
          results.push({
            tracking,
            status: info.status || 'unknown',
            client: info.client || '',
            wilaya_id: info.wilaya_id || '',
            montant,
            tarif_prestation: parseFloat(String(info.tarif_prestation || 0)),
            tarif_retour: parseFloat(String(info.tarif_retour || 0)),
            created_at: info.created_at || new Date().toISOString().split('T')[0],
            phone: info.phone || info.driver_phone || '',
            products: info.products || '',
          } as Order);
        });
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch batch starting at index ${i}`);
    }

    if (i + batchSize < trackings.length) await wait(300);
  }

  return results;
}

// ============================================================================
// SUPABASE — ARCHIVED ORDERS (write-once, never update status)
// ============================================================================

/**
 * Fetch archived orders from Supabase for this user.
 */
export async function fetchArchivedFromDb(userId: string): Promise<Order[]> {
  try {
    let allData: Order[] = [];
    let start = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data as Order[]);
      if (data.length < limit) break;
      start += limit;
    }
    return allData;
  } catch (error: any) {
    console.error('❌ fetchArchivedFromDb:', error.message);
    return [];
  }
}

/**
 * Save orders to the archived table (upsert by tracking — safe to call multiple times).
 */
export async function saveToArchive(orders: Order[], userId: string): Promise<void> {
  if (!orders.length) return;

  const rows = orders.map(o => ({
    tracking: o.tracking,
    user_id: userId,
    client: o.client || 'Unknown',
    status: o.status,
    wilaya_id: String(o.wilaya_id || ''),
    montant: parseFloat(String(o.montant || 0)),
    tarif_prestation: parseFloat(String(o.tarif_prestation || 0)),
    tarif_retour: parseFloat(String(o.tarif_retour || 0)),
    created_at: o.created_at,
    product: o.products || (o as any).product || null,
    phone: o.phone || null,
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('orders')
      .upsert(batch, { onConflict: 'tracking' });
    if (error) console.error('❌ saveToArchive batch error:', error.message);
  }
}

// ============================================================================
// ORDER REGISTRY — tracks all live order tracking numbers
// Lets us detect when an order disappears (= got archived by API)
// ============================================================================

/**
 * Upsert the current set of live tracking numbers into the registry.
 * Called after every live fetch so we know what was active.
 */
export async function updateOrderRegistry(orders: Order[], userId: string): Promise<void> {
  if (!orders.length) return;

  const rows = orders.map(o => ({
    tracking: o.tracking,
    user_id: userId,
    status: o.status,
    last_seen_at: new Date().toISOString(),
  }));

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    await supabase
      .from('order_registry')
      .upsert(rows.slice(i, i + batchSize), { onConflict: 'tracking' });
  }
}

/**
 * Find tracking numbers that were in the registry but are no longer in the live API.
 * These likely got archived. Excludes any already saved to the archive table.
 */
export async function detectDisappearedOrders(
  liveTrackings: Set<string>,
  userId: string
): Promise<string[]> {
  try {
    const { data: registry } = await supabase
      .from('order_registry')
      .select('tracking')
      .eq('user_id', userId);

    if (!registry?.length) return [];

    const disappeared = registry
      .map(r => r.tracking)
      .filter(t => !liveTrackings.has(t));

    if (!disappeared.length) return [];

    // Filter out any already saved to archive
    const { data: alreadySaved } = await supabase
      .from('orders')
      .select('tracking')
      .eq('user_id', userId)
      .in('tracking', disappeared);

    const alreadySavedSet = new Set((alreadySaved || []).map(r => r.tracking));
    return disappeared.filter(t => !alreadySavedSet.has(t));

  } catch (error) {
    console.error('❌ detectDisappearedOrders:', error);
    return [];
  }
}

/**
 * Remove tracking numbers from the registry (after archiving them).
 */
async function removeFromRegistry(trackings: string[]): Promise<void> {
  if (!trackings.length) return;
  await supabase.from('order_registry').delete().in('tracking', trackings);
}

// ============================================================================
// AUTO-ARCHIVE — runs in background after every live fetch
// ============================================================================

/**
 * Background job: detect disappeared orders → fetch their final state → save to archive.
 * Does NOT block the UI.
 */
export async function autoArchiveDisappeared(
  liveOrders: Order[],
  token: string,
  userId: string
): Promise<void> {
  try {
    const liveSet = new Set(liveOrders.map(o => o.tracking));

    // 1. Update registry with current live orders
    await updateOrderRegistry(liveOrders, userId);

    // 2. Find disappeared orders not yet in archive
    const disappeared = await detectDisappearedOrders(liveSet, userId);
    if (!disappeared.length) return;

    console.log(`🔍 ${disappeared.length} orders disappeared from live API — fetching final state...`);

    // 3. Fetch their final state from filter API
    const finalOrders = await fetchOrdersByTrackings(disappeared, token, 'all');

    // 4. Save to archive
    if (finalOrders.length) {
      await saveToArchive(finalOrders, userId);
      await removeFromRegistry(finalOrders.map(o => o.tracking));
      console.log(`📦 Auto-archived ${finalOrders.length} orders`);
    }

    // 5. For any we couldn't fetch from API (might be too old), still remove from registry
    //    so we don't keep trying
    const fetchedSet = new Set(finalOrders.map(o => o.tracking));
    const unfetchable = disappeared.filter(t => !fetchedSet.has(t));
    if (unfetchable.length) {
      console.warn(`⚠️ Could not fetch ${unfetchable.length} disappeared orders from API`);
      await removeFromRegistry(unfetchable);
    }

  } catch (error) {
    console.error('❌ autoArchiveDisappeared failed:', error);
  }
}

// ============================================================================
// MANUAL IMPORT — user provides tracking numbers
// ============================================================================

export interface ImportResult {
  saved: number;
  failed: string[];
  orders: Order[];
}

/**
 * Import archived orders by tracking number.
 * Calls the filter API, saves results to Supabase, removes from registry.
 */
export async function importArchivedOrders(
  rawTrackings: string[],
  token: string,
  userId: string
): Promise<ImportResult> {
  // Clean input
  const trackings = [...new Set(
    rawTrackings
      .flatMap(t => t.split(/[\s,;]+/))
      .map(t => t.trim().toUpperCase())
      .filter(Boolean)
  )];

  if (!trackings.length) return { saved: 0, failed: [], orders: [] };

  console.log(`📥 Importing ${trackings.length} tracking numbers...`);

  const orders = await fetchOrdersByTrackings(trackings, token, 'all');

  if (orders.length) {
    await saveToArchive(orders, userId);
    await removeFromRegistry(orders.map(o => o.tracking));
  }

  const savedSet = new Set(orders.map(o => o.tracking));
  const failed = trackings.filter(t => !savedSet.has(t));

  console.log(`✅ Imported ${orders.length}, failed: ${failed.length}`);
  return { saved: orders.length, failed, orders };
}

// ============================================================================
// TRACKING INFO
// ============================================================================

export async function trackOrder(
  trackingNumber: string,
  token: string
): Promise<TrackingInfo> {
  if (!token) throw new Error('API token is required to track orders.');
  try {
    const url = `${API_URL}/api/v1/get/tracking/info?api_token=${token}&tracking=${trackingNumber}`;
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to fetch tracking info: ${response.status}`);
    const data = await response.json();
    if (!data.tracking) data.tracking = trackingNumber;
    return data;
  } catch (error: any) {
    throw new Error(`Failed to track order: ${error.message}`);
  }
}

// Backward compatibility
export const fetchOrders = fetchOrdersFromApi;
export const fetchOrdersFromDb = () => Promise.resolve([]);
export const syncOrdersToDb = () => Promise.resolve();
export const getLastSyncTime = () => Promise.resolve(null);