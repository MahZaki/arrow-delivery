import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppCampaign, CrmOrder } from '../types';
import { getCampaigns, createCampaign, getRecipients, insertRecipients, markRecipientSent, updateCampaignStatus, interpolateTemplate } from '../services/whatsappCampaignService';
import { sendWhatsAppText, formatPhone } from '../services/whatsappService';
import { getCrmOrders } from '../services/crmService';
import {
  MessageSquare, Plus, Loader2, Send, CheckCircle, XCircle, Clock,
  ChevronRight, Eye, Users, FileText, Trash2, PauseCircle, Play,
  AlertCircle, Smartphone
} from 'lucide-react';

const WhatsAppCampaigns: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<WhatsAppCampaign | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<'ecotrack' | 'zrexpress' | 'all'>('zrexpress');
  const [statusFilter, setStatusFilter] = useState('Livré');
  const [previewOrders, setPreviewOrders] = useState<CrmOrder[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const loadCampaigns = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getCampaigns(user.id);
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const loadPreview = async () => {
    if (!user?.id) return;
    setPreviewLoading(true);
    try {
      const result = await getCrmOrders(user.id, {
        carrier: carrierFilter === 'all' ? undefined : carrierFilter,
        limit: 200,
      });
      const filtered = result.orders.filter(o => {
        if (statusFilter && o.status !== statusFilter) return false;
        return o.client_phone && o.client_phone.trim().length > 0;
      });
      setPreviewOrders(filtered);
    } catch (e: any) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user?.id || !name || !template) return;
    const id = await createCampaign({
      profile_id: user.id,
      name,
      message_template: template,
      carrier_filter: carrierFilter,
      status_filter: statusFilter || null,
    });
    const preview = previewOrders.filter(o => o.client_phone);
    await insertRecipients(
      preview.map(o => ({
        campaign_id: id,
        crm_order_id: o.id,
        phone: formatPhone(o.client_phone!),
        client_name: o.client_name,
      }))
    );
    await updateCampaignStatus(id, 'draft', { sent_count: 0, failed_count: 0 });
    setShowCreate(false);
    setName('');
    setTemplate('');
    setPreviewOrders([]);
    loadCampaigns();
  };

  const selectCampaign = async (c: WhatsAppCampaign) => {
    setSelected(c);
    const r = await getRecipients(c.id);
    setRecipients(r);
  };

  const startSending = async () => {
    if (!selected || !user?.wa_sender_api_key) return;
    setSending(true);
    setSendProgress({ sent: 0, failed: 0, total: recipients.length });
    await updateCampaignStatus(selected.id, 'sending');
    let sent = 0, failed = 0;
    for (const r of recipients) {
      if (r.status === 'sent') { sent++; continue; }
      try {
        const msg = interpolateTemplate(selected.message_template, {
          client_name: r.client_name,
          phone: r.phone,
        });
        await sendWhatsAppText(user.wa_sender_api_key!, r.phone, msg);
        await markRecipientSent(r.id);
        sent++;
      } catch (e: any) {
        await markRecipientSent(r.id, e.message);
        failed++;
      }
      setSendProgress({ sent, failed, total: recipients.length });
    }
    await updateCampaignStatus(selected.id, 'completed', { sent_count: sent, failed_count: failed });
    setSending(false);
    selectCampaign(selected);
  };

  const statusIcon = (s: string) => {
    if (s === 'sent') return <CheckCircle size={14} className="text-green-400" />;
    if (s === 'failed') return <XCircle size={14} className="text-red-400" />;
    return <Clock size={14} className="text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-arrow-black pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare size={28} className="text-arrow-green" /> WhatsApp Campaigns
          </h1>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-arrow-green text-black rounded-xl font-bold hover:bg-emerald-400 transition-colors">
            <Plus size={18} /> New Campaign
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-6">New Campaign</h2>
              <div className="space-y-4">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Campaign name"
                  className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-arrow-green focus:outline-none" />
                <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={4}
                  placeholder="Message template... Use {client_name} as placeholder"
                  className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-arrow-green focus:outline-none" />
                <div className="text-xs text-gray-500">Available placeholders: {'{client_name}'}, {'{phone}'}</div>
                <div className="flex gap-4">
                  <select value={carrierFilter} onChange={e => setCarrierFilter(e.target.value as any)}
                    className="flex-1 bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-arrow-green focus:outline-none">
                    <option value="all">All Carriers</option>
                    <option value="zrexpress">ZR Express</option>
                    <option value="ecotrack">Ecotrack</option>
                  </select>
                  <input value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    placeholder="Status filter (e.g. Livré)"
                    className="flex-1 bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-arrow-green focus:outline-none" />
                </div>

                <button onClick={loadPreview} disabled={previewLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-gray-300 rounded-xl hover:text-white transition-colors">
                  {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  Preview Recipients
                </button>

                {previewOrders.length > 0 && (
                  <div className="bg-neutral-900 rounded-xl p-4 max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-400 mb-2">{previewOrders.length} recipients with phone numbers</p>
                    {previewOrders.slice(0, 5).map(o => (
                      <div key={o.id} className="text-xs text-gray-500 py-1 flex gap-4">
                        <span className="text-white">{o.client_name || '—'}</span>
                        <span>{o.client_phone}</span>
                        <span className="text-arrow-green">{o.status}</span>
                      </div>
                    ))}
                    {previewOrders.length > 5 && <p className="text-xs text-gray-600 mt-1">+{previewOrders.length - 5} more</p>}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button onClick={handleCreate} disabled={!name || !template || previewOrders.length === 0}
                    className="flex-1 bg-arrow-green text-black py-3 rounded-xl font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors">
                    Create & Save Recipients
                  </button>
                  <button onClick={() => setShowCreate(false)}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        {loading && <div className="flex justify-center py-20"><Loader2 size={40} className="animate-spin text-arrow-green" /></div>}

        {!loading && campaigns.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">Create your first WhatsApp broadcast campaign.</p>
          </div>
        )}

        {!loading && campaigns.length > 0 && !selected && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(c => (
              <div key={c.id} onClick={() => selectCampaign(c)}
                className="bg-arrow-dark border border-neutral-800 rounded-xl p-5 hover:border-arrow-green/50 cursor-pointer transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare size={20} className="text-arrow-green" />
                  <h3 className="font-bold text-white">{c.name}</h3>
                </div>
                <div className="flex gap-4 text-sm text-gray-400 mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    c.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                    c.status === 'sending' ? 'bg-blue-900/50 text-blue-300' :
                    c.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>{c.status}</span>
                  <span><Users size={14} className="inline mr-1" />{c.recipient_count}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="text-green-400">{c.sent_count} sent</span>
                  {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} failed</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaign Detail */}
        {selected && (
          <div>
            <button onClick={() => setSelected(null)} className="text-arrow-green hover:underline mb-6 flex items-center gap-1">
              <ChevronRight size={16} className="rotate-180" /> Back to campaigns
            </button>

            <div className="bg-arrow-dark border border-neutral-800 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                  <div className="flex gap-3 mt-2 text-sm text-gray-400">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selected.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                      selected.status === 'sending' ? 'bg-blue-900/50 text-blue-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{selected.status}</span>
                    <span>Filter: {selected.carrier_filter} / {selected.status_filter || 'all'}</span>
                  </div>
                </div>
                {selected.status === 'draft' && !sending && (
                  <button onClick={startSending}
                    className="flex items-center gap-2 px-6 py-3 bg-arrow-green text-black rounded-xl font-bold hover:bg-emerald-400 transition-colors">
                    <Send size={18} /> Start Sending
                  </button>
                )}
              </div>

              <div className="bg-neutral-900 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">Message Template</p>
                <p className="text-white whitespace-pre-wrap">{selected.message_template}</p>
              </div>

              {sending && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Sending... {sendProgress.sent + sendProgress.failed}/{sendProgress.total}</span>
                    <span className="text-green-400">{sendProgress.sent} sent</span>
                    {sendProgress.failed > 0 && <span className="text-red-400">{sendProgress.failed} failed</span>}
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-arrow-green rounded-full transition-all duration-300"
                      style={{ width: `${((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              {sending && <div className="flex justify-center py-4"><Loader2 size={24} className="animate-spin text-arrow-green" /></div>}
            </div>

            {/* Recipients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Error</th>
                    <th className="px-4 py-3">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {recipients.map(r => (
                    <tr key={r.id} className="hover:bg-neutral-900/50">
                      <td className="px-4 py-3">{statusIcon(r.status)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-white">{r.phone}</td>
                      <td className="px-4 py-3 text-gray-300">{r.client_name || '—'}</td>
                      <td className="px-4 py-3 text-red-400 text-xs max-w-[200px] truncate">{r.error || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppCampaigns;
