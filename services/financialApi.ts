import { supabase } from '../lib/supabase';
import { SubAccountPayout, PayoutParcel, SubAccountBalance, ResellerParcel } from '../types';

// ============================================================================
// Delivered parcel states (from ZR Express workflow)
// ============================================================================
const DELIVERED_STATES = ['livre', 'encaisse', 'recouvert', 'livré', 'encaissé'];

// ============================================================================
// Get all sub-accounts for a master
// ============================================================================
export async function getSubAccounts(masterId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, markup_type, markup_value')
    .eq('master_id', masterId);
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Get delivered + unsettled parcels for a sub-account
// ============================================================================
export async function getDeliveredUnsettledParcels(profileId: string): Promise<ResellerParcel[]> {
  const { data, error } = await supabase
    .from('reseller_parcels')
    .select('*')
    .eq('profile_id', profileId)
    .in('state', DELIVERED_STATES)
    .eq('settled', false)
    .order('delivered_at', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Get all delivered parcels for a sub-account (settled + unsettled)
// ============================================================================
export async function getAllDeliveredParcels(profileId: string): Promise<ResellerParcel[]> {
  const { data, error } = await supabase
    .from('reseller_parcels')
    .select('*')
    .eq('profile_id', profileId)
    .in('state', DELIVERED_STATES)
    .order('delivered_at', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Calculate balance for a single sub-account
// ============================================================================
export async function getSubAccountBalance(
  subAccountId: string
): Promise<SubAccountBalance> {
  const [profileResult, parcelsResult] = await Promise.all([
    supabase.from('profiles').select('email').eq('id', subAccountId).single(),
    supabase
      .from('reseller_parcels')
      .select('*')
      .eq('profile_id', subAccountId)
      .in('state', DELIVERED_STATES),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (parcelsResult.error) throw new Error(parcelsResult.error.message);

  const parcels = parcelsResult.data || [];
  const email = profileResult.data?.email || 'Unknown';

  let totalCod = 0;
  let totalDeliveryFees = 0;
  let totalReturnFees = 0;
  let settledAmount = 0;
  let pendingPayout = 0;
  let masterProfit = 0;

  for (const p of parcels) {
    const cod = Number(p.cod_amount) || 0;
    const myPrice = Number(p.my_delivery_price) || 0;
    const zrPrice = Number(p.zr_delivery_price) || 0;
    const returnPrice = Number(p.zr_return_price) || 0;
    const net = cod - myPrice;

    totalCod += cod;
    totalDeliveryFees += myPrice;
    totalReturnFees += returnPrice;
    masterProfit += (myPrice - zrPrice);

    if (p.settled) {
      settledAmount += net;
    } else {
      pendingPayout += net;
    }
  }

  return {
    subAccountId,
    subAccountEmail: email,
    totalDelivered: parcels.length,
    totalCod,
    totalDeliveryFees,
    totalReturnFees,
    netBalance: pendingPayout,
    pendingPayout,
    settledAmount,
    masterProfit,
  };
}

// ============================================================================
// Get balances for ALL sub-accounts of a master
// ============================================================================
export async function getAllSubAccountBalances(
  masterId: string
): Promise<SubAccountBalance[]> {
  const subAccounts = await getSubAccounts(masterId);
  const balances = await Promise.all(
    subAccounts.map(sa => getSubAccountBalance(sa.id))
  );
  return balances;
}

// ============================================================================
// Get payouts for a sub-account
// ============================================================================
export async function getSubAccountPayouts(subAccountId: string): Promise<SubAccountPayout[]> {
  const { data, error } = await supabase
    .from('sub_account_payouts')
    .select('*')
    .eq('sub_account_id', subAccountId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Get all payouts created by a master
// ============================================================================
export async function getMasterPayouts(masterId: string): Promise<SubAccountPayout[]> {
  const { data, error } = await supabase
    .from('sub_account_payouts')
    .select('*')
    .eq('master_id', masterId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Get parcels included in a payout
// ============================================================================
export async function getPayoutParcels(payoutId: string): Promise<PayoutParcel[]> {
  const { data, error } = await supabase
    .from('payout_parcels')
    .select('*')
    .eq('payout_id', payoutId);
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Create a payout for a sub-account (master action)
// ============================================================================
export async function createPayout(
  masterId: string,
  subAccountId: string,
  parcelIds: string[]
): Promise<string> {
  // 1. Fetch the selected parcels
  const { data: parcels, error: fetchError } = await supabase
    .from('reseller_parcels')
    .select('*')
    .in('id', parcelIds)
    .eq('profile_id', subAccountId)
    .eq('settled', false);

  if (fetchError) throw new Error(fetchError.error || fetchError.message);
  if (!parcels || parcels.length === 0) throw new Error('No valid parcels found for payout');

  // 2. Calculate total payout amount
  let totalAmount = 0;
  const payoutParcels: Array<{ cod_amount: number; delivery_price: number; net_amount: number; reseller_parcel_id: string }> = [];

  for (const p of parcels) {
    const cod = Number(p.cod_amount) || 0;
    const myPrice = Number(p.my_delivery_price) || 0;
    const net = cod - myPrice;
    totalAmount += net;
    payoutParcels.push({
      cod_amount: cod,
      delivery_price: myPrice,
      net_amount: net,
      reseller_parcel_id: p.id,
    });
  }

  // 3. Create the payout record
  const { data: payout, error: payoutError } = await supabase
    .from('sub_account_payouts')
    .insert({
      master_id: masterId,
      sub_account_id: subAccountId,
      amount: totalAmount,
      status: 'pending',
      reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
    })
    .select('id')
    .single();

  if (payoutError) throw new Error(payoutError.message);
  const payoutId = payout.id;

  // 4. Create payout_parcels junction records
  const junctionRecords = payoutParcels.map(pp => ({
    payout_id: payoutId,
    reseller_parcel_id: pp.reseller_parcel_id,
    cod_amount: pp.cod_amount,
    delivery_price: pp.delivery_price,
    net_amount: pp.net_amount,
  }));

  const { error: junctionError } = await supabase
    .from('payout_parcels')
    .insert(junctionRecords);

  if (junctionError) throw new Error(junctionError.message);

  // 5. Mark parcels as settled
  const { error: settleError } = await supabase
    .from('reseller_parcels')
    .update({ settled: true, payout_id: payoutId })
    .in('id', parcelIds);

  if (settleError) throw new Error(settleError.message);

  // 6. Create a transaction record for the sub-account
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      profile_id: subAccountId,
      type: 'payout',
      amount: -totalAmount,
      description: `Payout ${payout.reference}`,
    });

  if (txError) throw new Error(txError.message);

  return payoutId;
}

// ============================================================================
// Update payout status (accept/reject)
// ============================================================================
export async function updatePayoutStatus(
  payoutId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  if (status === 'rejected') {
    // Unsettle the parcels and delete junction records
    const { data: parcels } = await supabase
      .from('payout_parcels')
      .select('reseller_parcel_id')
      .eq('payout_id', payoutId);

    if (parcels && parcels.length > 0) {
      const parcelIds = parcels.map(p => p.reseller_parcel_id);
      await supabase
        .from('reseller_parcels')
        .update({ settled: false, payout_id: null })
        .in('id', parcelIds);
    }

    await supabase.from('payout_parcels').delete().eq('payout_id', payoutId);
    await supabase.from('sub_account_payouts').delete().eq('id', payoutId);
  } else {
    const { error } = await supabase
      .from('sub_account_payouts')
      .update({ status })
      .eq('id', payoutId);
    if (error) throw new Error(error.message);
  }
}

// ============================================================================
// Remove a single parcel from a payout (re-add to unsettled)
// ============================================================================
export async function removeParcelFromPayout(
  payoutId: string,
  resellerParcelId: string
): Promise<void> {
  // 1. Get the parcel's net amount from junction
  const { data: junction } = await supabase
    .from('payout_parcels')
    .select('net_amount')
    .eq('payout_id', payoutId)
    .eq('reseller_parcel_id', resellerParcelId)
    .single();

  const netAmount = junction?.net_amount || 0;

  // 2. Delete junction record
  await supabase
    .from('payout_parcels')
    .delete()
    .eq('payout_id', payoutId)
    .eq('reseller_parcel_id', resellerParcelId);

  // 3. Unsettle the parcel
  await supabase
    .from('reseller_parcels')
    .update({ settled: false, payout_id: null })
    .eq('id', resellerParcelId);

  // 4. Update payout amount
  const { data: payout } = await supabase
    .from('sub_account_payouts')
    .select('amount')
    .eq('id', payoutId)
    .single();

  if (payout) {
    const newAmount = Number(payout.amount) - netAmount;
    await supabase
      .from('sub_account_payouts')
      .update({ amount: newAmount })
      .eq('id', payoutId);
  }
}

// ============================================================================
// Add a parcel to an existing pending payout
// ============================================================================
export async function addParcelToPayout(
  payoutId: string,
  resellerParcelId: string
): Promise<void> {
  // 1. Fetch the parcel
  const { data: parcel, error: parcelError } = await supabase
    .from('reseller_parcels')
    .select('*')
    .eq('id', resellerParcelId)
    .single();

  if (parcelError || !parcel) throw new Error('Parcel not found');
  if (parcel.settled) throw new Error('Parcel already settled');

  const cod = Number(parcel.cod_amount) || 0;
  const myPrice = Number(parcel.my_delivery_price) || 0;
  const net = cod - myPrice;

  // 2. Create junction record
  const { error: junctionError } = await supabase
    .from('payout_parcels')
    .insert({
      payout_id: payoutId,
      reseller_parcel_id: resellerParcelId,
      cod_amount: cod,
      delivery_price: myPrice,
      net_amount: net,
    });

  if (junctionError) throw new Error(junctionError.message);

  // 3. Settle the parcel
  await supabase
    .from('reseller_parcels')
    .update({ settled: true, payout_id: payoutId })
    .eq('id', resellerParcelId);

  // 4. Update payout amount
  const { data: payout } = await supabase
    .from('sub_account_payouts')
    .select('amount')
    .eq('id', payoutId)
    .single();

  if (payout) {
    const newAmount = Number(payout.amount) + net;
    await supabase
      .from('sub_account_payouts')
      .update({ amount: newAmount })
      .eq('id', payoutId);
  }
}
