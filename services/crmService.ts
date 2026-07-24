import { supabase } from '../lib/supabase';
import { CrmOrder, Order, ZrCredentials } from '../types';
import { searchParcels } from './zrExpressApi';

export async function getCrmOrders(
  profileIds: string[],
  options?: {
    carrier?: 'ecotrack' | 'zrexpress';
    status?: string;
    search?: string;
    productSearch?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ orders: CrmOrder[]; total: number }> {
  if (profileIds.length === 0) return { orders: [], total: 0 };

  let query = supabase
    .from('crm_orders')
    .select('*', { count: 'exact' })
    .in('profile_id', profileIds);

  if (options?.carrier) {
    query = query.eq('carrier', options.carrier);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.productSearch) {
    query = query.ilike('product_description', `%${options.productSearch}%`);
  }

  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(
      `tracking_number.ilike.${term},client_name.ilike.${term},client_phone.ilike.${term},product_description.ilike.${term}`
    );
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { orders: (data || []) as CrmOrder[], total: count || 0 };
}

export async function upsertCrmOrder(
  order: Partial<CrmOrder> & { profile_id: string; tracking_number: string; carrier: 'ecotrack' | 'zrexpress' }
): Promise<void> {
  const { error } = await supabase.from('crm_orders').upsert({
    ...order,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'profile_id, tracking_number',
  });
  if (error) throw new Error(error.message);
}

export async function syncEcotrackOrdersToCrm(
  profileId: string,
  orders: Order[]
): Promise<number> {
  let synced = 0;
  for (const o of orders) {
    await upsertCrmOrder({
      profile_id: profileId,
      carrier: 'ecotrack',
      tracking_number: o.tracking,
      status: o.status,
      client_name: o.client,
      client_phone: o.phone || o.telephone || null,
      wilaya_id: String(o.wilaya_id || ''),
      cod_amount: Number(o.montant || 0),
      delivery_price: Number(o.tarif_prestation || 0),
      return_price: Number(o.tarif_retour || 0),
      product_description: o.products || o.product || null,
      carrier_raw: o as any,
    });
    synced++;
  }
  return synced;
}

export async function syncZrParcelsToCrm(
  profileId: string,
  creds: ZrCredentials
): Promise<number> {
  let synced = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await searchParcels(creds, {
      pageNumber: page,
      pageSize: 100,
      orderBy: ['createdAt desc'],
    });

    for (const p of res.items) {
      await upsertCrmOrder({
        profile_id: profileId,
        carrier: 'zrexpress',
        tracking_number: p.trackingNumber,
        status: p.state?.name || null,
        client_name: p.customer?.name || null,
        client_phone: p.customer?.phone?.number1 || null,
        client_email: p.customer?.email || null,
        city: p.deliveryAddress?.city || null,
        district: p.deliveryAddress?.district || null,
        street_address: p.deliveryAddress?.street || null,
        cod_amount: p.amount || 0,
        delivery_price: p.deliveryPrice || 0,
        return_price: p.ReturnPrice || 0,
        product_description: p.productsDescription || p.description || null,
        weight: p.weight?.effectiveWeight || p.weight?.weight || null,
        zr_parcel_id: p.id,
        carrier_raw: p as any,
      });
      synced++;
    }

    hasMore = res.hasNext;
    page++;
  }

  return synced;
}

export async function getCrmOrderById(id: string): Promise<CrmOrder | null> {
  const { data, error } = await supabase
    .from('crm_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as CrmOrder;
}

export async function getCrmStatuses(profileIds: string[]): Promise<string[]> {
  if (profileIds.length === 0) return [];
  const { data, error } = await supabase
    .from('crm_orders')
    .select('status')
    .in('profile_id', profileIds)
    .not('status', 'is', null);
  if (error) return [];
  const statuses = [...new Set(data.map(r => r.status as string))].filter(Boolean).sort();
  return statuses;
}
