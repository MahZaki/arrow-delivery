import { supabase } from '../lib/supabase';
import { WhatsAppCampaign, WhatsAppRecipient } from '../types';

export async function getCampaigns(profileId: string): Promise<WhatsAppCampaign[]> {
  const { data, error } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as WhatsAppCampaign[];
}

export async function createCampaign(campaign: {
  profile_id: string;
  name: string;
  message_template: string;
  carrier_filter: 'ecotrack' | 'zrexpress' | 'all';
  status_filter: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('whatsapp_campaigns')
    .insert({
      profile_id: campaign.profile_id,
      name: campaign.name,
      message_template: campaign.message_template,
      carrier_filter: campaign.carrier_filter,
      status_filter: campaign.status_filter,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: WhatsAppCampaign['status'],
  counts?: { sent_count?: number; failed_count?: number }
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_campaigns')
    .update({ status, ...counts, updated_at: new Date().toISOString() })
    .eq('id', campaignId);
  if (error) throw new Error(error.message);
}

export async function updateCampaign(
  campaignId: string,
  updates: { name?: string; message_template?: string; carrier_filter?: string; status_filter?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', campaignId);
  if (error) throw new Error(error.message);
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_recipients')
    .delete()
    .eq('campaign_id', campaignId);
  if (error) throw new Error(error.message);
  const { error: err2 } = await supabase
    .from('whatsapp_campaigns')
    .delete()
    .eq('id', campaignId);
  if (err2) throw new Error(err2.message);
}

export async function getRecipients(campaignId: string): Promise<WhatsAppRecipient[]> {
  const { data, error } = await supabase
    .from('whatsapp_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as WhatsAppRecipient[];
}

export async function insertRecipients(
  recipients: Array<{
    campaign_id: string;
    crm_order_id: string | null;
    phone: string;
    client_name: string | null;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_recipients')
    .insert(recipients);
  if (error) throw new Error(error.message);
}

export async function markRecipientSent(id: string, errorMsg?: string): Promise<void> {
  const update: Partial<WhatsAppRecipient> = errorMsg
    ? { status: 'failed', error: errorMsg }
    : { status: 'sent', sent_at: new Date().toISOString() };
  const { error } = await supabase
    .from('whatsapp_recipients')
    .update(update)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export function interpolateTemplate(template: string, vars: Record<string, string | number | null>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val != null ? String(val) : `{${key}}`;
  });
}
