import { API_URL } from '../constants';
import { Order, TrackingInfo } from '../types';
import { supabase } from '../lib/supabase';

// ============================================================================
// SIMPLE CONFIGURATION
// ============================================================================

const CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  BATCH_SIZE: 5,              // Fetch 5 pages at once
  BATCH_DELAY: 800,           // Small delay between batches
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// SIMPLE FETCH WITH RETRY
// ============================================================================

async function fetchWithRetry(url: string, retries = CONFIG.RETRY_ATTEMPTS): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      // Success
      if (response.ok) return response;

      // Rate limited - wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : CONFIG.RETRY_DELAY * (i + 1);
        console.warn(`Rate limited. Waiting ${delay}ms...`);
        await wait(delay);
        continue;
      }

      // Server error - retry
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
// CACHE HELPERS
// ============================================================================

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;

  const age = Date.now() - item.timestamp;
  if (age > CONFIG.CACHE_DURATION) {
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
// FETCH ORDERS FROM API
// ============================================================================

/**
 * Fetch orders from ECOTRACK API with pagination
 */
export async function fetchOrdersFromApi(token: string): Promise<Order[]> {
  console.log('🚀 Fetching orders from ECOTRACK...');
  const startTime = Date.now();

  // Check cache
  const cacheKey = `orders_${token}`;
  const cached = getCached<Order[]>(cacheKey);
  if (cached) {
    console.log('✅ Using cached data');
    return cached;
  }

  const startDate = '2018-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  try {
    // Step 1: Fetch first page to get total pages
    const firstUrl = `${API_URL}/api/v1/get/orders?api_token=${token}&start_date=${startDate}&end_date=${endDate}&page=1`;
    const firstResponse = await fetchWithRetry(firstUrl);

    if (!firstResponse.ok) {
      throw new Error(`API returned ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const allOrders: Order[] = firstData.data || [];
    const totalPages = firstData.last_page || 1;
    const totalOrders = firstData.total || 0;

    console.log(`📊 Found ${totalOrders} orders across ${totalPages} pages`);

    // Step 2: Fetch remaining pages in batches
    if (totalPages > 1) {
      const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

      for (let i = 0; i < pageNumbers.length; i += CONFIG.BATCH_SIZE) {
        const batch = pageNumbers.slice(i, i + CONFIG.BATCH_SIZE);
        
        console.log(`📡 Fetching pages ${batch[0]}-${batch[batch.length - 1]}...`);

        // Fetch batch in parallel
        const promises = batch.map(async (page) => {
          const url = `${API_URL}/api/v1/get/orders?api_token=${token}&start_date=${startDate}&end_date=${endDate}&page=${page}`;
          try {
            const response = await fetchWithRetry(url);
            if (!response.ok) return [];
            const data = await response.json();
            return data.data || [];
          } catch (error) {
            console.warn(`Failed to fetch page ${page}`);
            return [];
          }
        });

        const results = await Promise.all(promises);
        results.forEach(orders => allOrders.push(...orders));

        // Small delay between batches
        if (i + CONFIG.BATCH_SIZE < pageNumbers.length) {
          await wait(CONFIG.BATCH_DELAY);
        }
      }
    }

    // Remove duplicates (use tracking number as key)
    const uniqueOrders = Array.from(
      new Map(allOrders.map(order => [order.tracking, order])).values()
    );

    // Cache results
    setCache(cacheKey, uniqueOrders);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Fetched ${uniqueOrders.length} orders in ${duration}s`);

    return uniqueOrders;

  } catch (error: any) {
    console.error('❌ Failed to fetch orders:', error.message);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
}

// ============================================================================
// TRACK SINGLE ORDER
// ============================================================================

/**
 * Track a single order by tracking number
 */
export async function trackOrder(
  trackingNumber: string,
  token: string
): Promise<TrackingInfo> {
  if (!token) throw new Error('API token is required to track orders.');
  try {
    const url = `${API_URL}/api/v1/get/tracking/info?api_token=${token}&tracking=${trackingNumber}`;
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch tracking info: ${response.status}`);
    }

    const data = await response.json();
    if (!data.tracking) data.tracking = trackingNumber;
    return data;

  } catch (error: any) {
    console.error('❌ Tracking error:', error.message);
    throw new Error(`Failed to track order: ${error.message}`);
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Fetch orders from local database
 */
export async function fetchOrdersFromDb(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Order[];

  } catch (error: any) {
    console.error('❌ Database error:', error.message);
    throw error;
  }
}

/**
 * Get last sync time for a user
 */
export async function getLastSyncTime(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('sync_logs')
      .select('last_sync')
      .eq('user_id', userId)
      .order('last_sync', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.last_sync || null;

  } catch (error) {
    return null;
  }
}

/**
 * Sync orders from API to database
 */
export async function syncOrdersToDb(token: string, userId: string): Promise<void> {
  if (!userId) throw new Error('User ID required');

  console.log('🔄 Syncing to database...');
  const startTime = Date.now();

  try {
    // Clear cache to force fresh fetch
    clearCache();

    // Fetch from API
    const apiOrders = await fetchOrdersFromApi(token);

    if (apiOrders.length === 0) {
      console.log('⚠️ No orders to sync');
      await updateSyncLog(userId);
      return;
    }

    // Format for database
    const dbOrders = apiOrders.map(order => ({
      tracking: order.tracking,
      user_id: userId,
      client: order.client || 'Unknown',
      status: order.status,
      wilaya_id: String(order.wilaya_id),
      montant: parseFloat(String(order.montant || 0)),
      tarif_prestation: parseFloat(String(order.tarif_prestation || 0)),
      tarif_retour: parseFloat(String(order.tarif_retour || 0)),
      created_at: order.created_at,
      product: order.products || order.product || null,
      phone: order.phone || order.telephone || null,
      updated_at: new Date().toISOString()
    }));

    // Upsert in batches
    const batchSize = 500;
    const batches = Math.ceil(dbOrders.length / batchSize);

    console.log(`📦 Saving ${dbOrders.length} orders in ${batches} batches...`);

    for (let i = 0; i < dbOrders.length; i += batchSize) {
      const batch = dbOrders.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      const { error } = await supabase
        .from('orders')
        .upsert(batch, { onConflict: 'tracking' });

      if (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        throw error;
      }

      console.log(`   ✓ Batch ${batchNum}/${batches}`);
    }

    // Update sync log
    await updateSyncLog(userId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Sync complete in ${duration}s`);

  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

/**
 * Update sync log with current timestamp
 */
async function updateSyncLog(userId: string): Promise<void> {
  await supabase
    .from('sync_logs')
    .upsert({
      user_id: userId,
      last_sync: new Date().toISOString()
    });
}

// Backward compatibility
export const fetchOrders = fetchOrdersFromApi;