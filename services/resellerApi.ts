import { supabase } from '../lib/supabase';
import { ResellerParcel, ZrCredentials } from '../types';
import { searchParcels } from './zrExpressApi';

export async function getMyParcels(profileId: string): Promise<ResellerParcel[]> {
  const { data, error } = await supabase
    .from('reseller_parcels')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export interface ParcelWithOwner extends ResellerParcel {
  owner_email: string | null;
  owner_role: string | null;
}

export async function getAllResellerParcelsForMaster(
  masterId: string
): Promise<ParcelWithOwner[]> {
  const subAccounts = await supabase
    .from('profiles')
    .select('id, email, role')
    .or(`id.eq.${masterId},master_id.eq.${masterId}`);

  if (subAccounts.error) throw new Error(subAccounts.error.message);
  const profileIds = (subAccounts.data || []).map(p => p.id);
  const emailMap = new Map((subAccounts.data || []).map(p => [p.id, p.email]));
  const roleMap = new Map((subAccounts.data || []).map(p => [p.id, p.role]));

  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from('reseller_parcels')
    .select('*')
    .in('profile_id', profileIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(p => ({
    ...p,
    owner_email: emailMap.get(p.profile_id) || null,
    owner_role: roleMap.get(p.profile_id) || null,
  }));
}

export async function saveParcel(
  profileId: string,
  zrParcelId: string,
  trackingNumber: string,
  codAmount: number,
  zrDeliveryPrice: number,
  myDeliveryPrice: number,
  state: string
): Promise<string> {
  const { data, error } = await supabase.from('reseller_parcels').insert({
    profile_id: profileId,
    zr_parcel_id: zrParcelId,
    tracking_number: trackingNumber,
    cod_amount: codAmount,
    zr_delivery_price: zrDeliveryPrice,
    my_delivery_price: myDeliveryPrice,
    state,
  }).select('id').single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function syncZrParcelsToReseller(
  profileId: string,
  creds: ZrCredentials
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await searchParcels(creds, {
      pageNumber: page,
      pageSize: 100,
      orderBy: ['createdAt desc'],
    });

    for (const parcel of res.items) {
      const payload = {
        profile_id: profileId,
        zr_parcel_id: parcel.id,
        tracking_number: parcel.trackingNumber,
        cod_amount: parcel.amount,
        zr_delivery_price: parcel.deliveryPrice,
        my_delivery_price: parcel.deliveryPrice,
        zr_return_price: parcel.ReturnPrice ?? 0,
        state: parcel.state.name,
        delivered_at: parcel.state.name === 'Livré' ? parcel.lastStateUpdateAt : null,
        updated_at: new Date().toISOString(),
      };

      const existing = await supabase
        .from('reseller_parcels')
        .select('id')
        .eq('zr_parcel_id', parcel.id)
        .maybeSingle();

      if (existing.data) {
        const { error: updateError } = await supabase
          .from('reseller_parcels')
          .update(payload)
          .eq('id', existing.data.id);
        if (!updateError) updated++;
      } else {
        const { error: insertError } = await supabase
          .from('reseller_parcels')
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (!insertError) inserted++;
      }
    }

    hasMore = res.hasNext;
    page++;
  }

  return { inserted, updated };
}
