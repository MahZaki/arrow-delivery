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

export async function saveParcel(
  profileId: string,
  zrParcelId: string,
  trackingNumber: string,
  codAmount: number,
  zrDeliveryPrice: number,
  myDeliveryPrice: number,
  state: string
): Promise<void> {
  const { error } = await supabase.from('reseller_parcels').insert({
    profile_id: profileId,
    zr_parcel_id: zrParcelId,
    tracking_number: trackingNumber,
    cod_amount: codAmount,
    zr_delivery_price: zrDeliveryPrice,
    my_delivery_price: myDeliveryPrice,
    state,
  });

  if (error) throw new Error(error.message);
}
