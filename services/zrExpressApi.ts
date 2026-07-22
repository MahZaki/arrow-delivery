import {
  ZrParcel, ZrParcelSearchRequest, ZrParcelSearchResponse,
  ZrCreateParcelRequest, ZrCreateParcelResponse,
  ZrTerritory, ZrTerritorySearchRequest, ZrTerritorySearchResponse,
  ZrCredentials
} from '../types';

const ZR_API_BASE = '/api/zr';

const CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_DURATION: 5 * 60 * 1000,
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

export function clearZrCache(): void {
  cache.clear();
}

function headers(creds: ZrCredentials): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Tenant': creds.tenantId,
    'X-Api-Key': creds.apiKey,
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retries = CONFIG.RETRY_ATTEMPTS): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
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

async function zrRequest<T>(
  creds: ZrCredentials,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${ZR_API_BASE}${path}`;
  const response = await fetchWithRetry(url, {
    method,
    headers: headers(creds),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`ZR API error ${response.status} (${response.statusText}): ${errorBody || '(no body)'} [${method} ${url}]`);
  }
  return response.json();
}

export async function searchParcels(
  creds: ZrCredentials,
  params: ZrParcelSearchRequest
): Promise<ZrParcelSearchResponse> {
  const cacheKey = `zr_parcels_${JSON.stringify(params)}`;
  const cached = getCached<ZrParcelSearchResponse>(cacheKey);
  if (cached) return cached;
  const result = await zrRequest<ZrParcelSearchResponse>(creds, 'POST', '/parcels/search', params);
  setCache(cacheKey, result);
  return result;
}

export async function createParcel(
  creds: ZrCredentials,
  data: ZrCreateParcelRequest
): Promise<ZrCreateParcelResponse> {
  return zrRequest<ZrCreateParcelResponse>(creds, 'POST', '/parcels', data);
}

export async function getParcelByTracking(
  creds: ZrCredentials,
  trackingNumber: string
): Promise<ZrParcel> {
  return zrRequest<ZrParcel>(creds, 'GET', `/parcels/${encodeURIComponent(trackingNumber)}`);
}

export async function getTerritories(
  creds: ZrCredentials,
  params: ZrTerritorySearchRequest = { pageNumber: 1, pageSize: 100, orderBy: ['code asc'] }
): Promise<ZrTerritorySearchResponse> {
  const cacheKey = `zr_territories_${JSON.stringify(params)}`;
  const cached = getCached<ZrTerritorySearchResponse>(cacheKey);
  if (cached) return cached;
  const result = await zrRequest<ZrTerritorySearchResponse>(creds, 'POST', '/territories/search', params);
  if (result.items.length > 0) {
    setCache(cacheKey, result);
  }
  return result;
}

export async function getAllWilayas(creds: ZrCredentials): Promise<ZrTerritory[]> {
  const all: ZrTerritory[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await getTerritories(creds, {
      pageNumber: page,
      pageSize: 100,
      orderBy: ['code asc'],
    });
    all.push(...res.items.filter(t => t.level === 'wilaya'));
    hasMore = res.hasNext;
    page++;
  }
  return all;
}

export async function getCommunesByWilaya(creds: ZrCredentials, wilayaId: string): Promise<ZrTerritory[]> {
  const all: ZrTerritory[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await getTerritories(creds, {
      pageNumber: page,
      pageSize: 100,
      orderBy: ['code asc'],
      advancedFilter: {
        logic: 'AND',
        filters: [{ field: 'parentId', operator: 'equals', value: wilayaId }],
      },
    });
    all.push(...res.items);
    hasMore = res.hasNext;
    page++;
  }
  return all;
}

export async function getParcelStats(
  creds: ZrCredentials,
  workflowId?: string
): Promise<Array<{ stateId: string; stateName: string; count: number; color: string }>> {
  const workflowParam = workflowId ? `?workflowId=${workflowId}` : '';
  return zrRequest(creds, 'GET', `/parcels/stats${workflowParam}`);
}
