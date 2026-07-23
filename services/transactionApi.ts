import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

export async function getTransactions(profileId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getBalance(profileId: string): Promise<number> {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('profile_id', profileId);

  if (error) throw new Error(error.message);
  return (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
}

export async function addTransaction(
  profileId: string,
  type: Transaction['type'],
  amount: number,
  refParcelId?: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.from('transactions').insert({
    profile_id: profileId,
    type,
    amount,
    ref_parcel_id: refParcelId || null,
    description: description || null,
  });

  if (error) throw new Error(error.message);
}
