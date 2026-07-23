import { supabase } from '../lib/supabase';
import { ResellerParcel } from '../types';

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
