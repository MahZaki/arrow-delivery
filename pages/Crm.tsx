import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CrmOrder } from '../types';
import { getCrmOrders, syncEcotrackOrdersToCrm, syncZrParcelsToCrm, getCrmStatuses } from '../services/crmService';
import { fetchOrdersFromApi } from '../services/api';
import {
  Search, ChevronDown, ChevronUp, Package, Truck,
  Phone, MapPin, DollarSign, Calendar, User, Box,
  Loader2, Filter, X, ChevronLeft, ChevronRight, RefreshCw, Send, MessageSquare,
  Square, CheckSquare
} from 'lucide-react';

const Crm: React.FC = () => {
  const { user, resolveZrCredentials } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<'all' | 'ecotrack' | 'zrexpress'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [waModal, setWaModal] = useState<{ order: CrmOrder } | null>(null);
  const [waText, setWaText] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 50;

  const handleSync = async () => {
    if (!user?.id) return;
    setSyncing(true);
    setError(null);
    try {
      let syncedCount = 0;
      const warnings: string[] = [];

      // Sync Ecotrack orders
      if (user.api_token) {
        try {
          const orders = await fetchOrdersFromApi(user.api_token);
          syncedCount += await syncEcotrackOrdersToCrm(user.id, orders);
        } catch (e: any) {
          if (e.message?.includes('401')) {
            warnings.push('Ecotrack API token is invalid. Use Dashboard to update it.');
          } else {
            warnings.push('Ecotrack sync failed: ' + e.message);
          }
        }
      }

      // Sync ZR Express parcels (only for master accounts)
      const zrCreds = await resolveZrCredentials();
      if (zrCreds) {
        if (user.master_id) {
          warnings.push('ZR sync skipped — only the master account can sync parcels');
        } else {
          try {
            syncedCount += await syncZrParcelsToCrm(user.id, zrCreds);
          } catch (e: any) {
            warnings.push('ZR sync failed: ' + e.message);
          }
        }
      }

      if (syncedCount > 0) {
        await loadOrders();
      }

      if (warnings.length > 0) {
        setError(warnings.join('. '));
      } else if (syncedCount === 0 && !user.api_token && !zrCreds) {
        setError('No API token or ZR credentials configured. Set them in Dashboard or Admin.');
      }

      setSyncing(false);
    } catch (err: any) {
      setError('Unexpected error: ' + err.message);
      setSyncing(false);
    }
  };

  const handleSendWa = async () => {
    if (!waModal || !user?.wa_sender_api_key || !waText.trim()) return;
    setWaSending(true);
    setWaResult(null);
    try {
      const { sendWhatsAppText, formatPhone } = await import('../services/whatsappService');
      const phone = formatPhone(waModal.order.client_phone || '');
      await sendWhatsAppText(user.wa_sender_api_key, phone, waText.trim());
      setWaResult('Message sent successfully!');
    } catch (e: any) {
      setWaResult('Failed: ' + e.message);
    } finally {
      setWaSending(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      orders.forEach(o => next.add(o.id));
      return next;
    });
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleCreateCampaign = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    navigate(`/whatsapp?selected=${ids.join(',')}`);
  };

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCrmOrders([user.id, user.master_id].filter(Boolean) as string[], {
        carrier: carrierFilter === 'all' ? undefined : carrierFilter,
        status: statusFilter || undefined,
        search: search || undefined,
        productSearch: productSearch || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setOrders(result.orders);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, carrierFilter, search, productSearch, statusFilter, user?.master_id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!user?.id) return;
    const ids = [user.id, user.master_id].filter(Boolean) as string[];
    getCrmStatuses(ids).then(setAvailableStatuses);
  }, [user?.id, user?.master_id]);

  useEffect(() => {
    setPage(0);
  }, [search, productSearch, carrierFilter, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-arrow-black pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package size={28} className="text-amber-400" /> CRM Orders
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl transition-colors disabled:opacity-50 text-sm font-bold border border-amber-600/30">
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <div className="text-sm text-gray-400">
              <span className="font-bold text-white">{total}</span> orders
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-arrow-dark border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-arrow-green focus:outline-none max-w-[180px]"
          >
            <option value="">All Statuses</option>
            {availableStatuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tracking, client or phone..."
              className="w-full bg-arrow-dark border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-arrow-green focus:outline-none text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative min-w-[160px]">
            <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Products..."
              className="w-full bg-arrow-dark border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-arrow-green focus:outline-none text-sm"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-1 bg-arrow-dark border border-neutral-700 rounded-xl p-1">
            {(['all', 'ecotrack', 'zrexpress'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCarrierFilter(c)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${
                  carrierFilter === c
                    ? c === 'zrexpress' ? 'bg-amber-600 text-black' : c === 'ecotrack' ? 'bg-arrow-green text-black' : 'bg-neutral-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {c === 'zrexpress' ? <Truck size={14} /> : c === 'ecotrack' ? <Box size={14} /> : <Filter size={14} />}
                {c === 'all' ? 'All' : c === 'ecotrack' ? 'Ecotrack' : 'ZR Express'}
              </button>
            ))}
          </div>
        </div>

        {/* Selection Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 mb-4 px-4 py-3 bg-arrow-green/10 border border-arrow-green/30 rounded-xl">
            <span className="text-sm text-white font-bold">{selectedIds.size} selected</span>
            <button onClick={deselectAll} className="text-xs text-gray-400 hover:text-white transition-colors">Clear selection</button>
            <div className="flex-1" />
            <button onClick={handleCreateCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-arrow-green text-black rounded-xl font-bold hover:bg-emerald-400 transition-colors text-sm">
              <MessageSquare size={16} /> Create Campaign
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-300 mb-6">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-amber-400" />
          </div>
        )}

        {/* Table */}
        {!loading && orders.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm mt-1">Orders from Ecotrack and ZR Express will appear here automatically.</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button onClick={selectedIds.size === orders.length ? deselectAll : selectAllPage} className="text-gray-400 hover:text-white transition-colors">
                        {selectedIds.size === orders.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Carrier</th>
                    <th className="px-4 py-3">Tracking</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">COD</th>
                    <th className="px-4 py-3">Delivery</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {orders.map(o => (
                    <React.Fragment key={o.id}>
                      <tr
                        className="hover:bg-neutral-900/50 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleSelect(o.id)} className="text-gray-400 hover:text-white transition-colors">
                            {selectedIds.has(o.id) ? <CheckSquare size={16} className="text-arrow-green" /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {expandedId === o.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                            o.carrier === 'zrexpress'
                              ? 'bg-amber-900/50 text-amber-300'
                              : 'bg-blue-900/50 text-blue-300'
                          }`}>
                            {o.carrier === 'zrexpress' ? <Truck size={12} /> : <Box size={12} />}
                            {o.carrier === 'zrexpress' ? 'ZR' : 'ECO'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-white">{o.tracking_number}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-[150px] truncate">{o.client_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{o.client_phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs bg-neutral-800 text-gray-300">
                            {o.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-arrow-green font-bold">
                          {o.cod_amount > 0 ? `${o.cod_amount.toLocaleString()} DA` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {o.delivery_price > 0 ? `${o.delivery_price.toLocaleString()} DA` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>

                      {/* Expanded details */}
                      {expandedId === o.id && (
                        <tr key={`${o.id}-details`}>
                          <td colSpan={10} className="px-8 py-6 bg-neutral-900/30">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                <h4 className="text-xs uppercase text-gray-500 font-bold mb-3 flex items-center gap-2">
                                  <User size={14} /> Client Info
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">Name:</span> <span className="text-white">{o.client_name || '—'}</span></p>
                                  <p><span className="text-gray-500">Phone:</span> <span className="text-white">{o.client_phone || '—'}</span></p>
                                  <p><span className="text-gray-500">Email:</span> <span className="text-white">{o.client_email || '—'}</span></p>
                                </div>
                                {o.client_phone && (
                                  <button onClick={(e) => { e.stopPropagation(); setWaModal({ order: o }); setWaText(`Bonjour ${o.client_name || ''}, votre colis ${o.tracking_number} est en cours de livraison.`); setWaResult(null); }}
                                    className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-bold transition-colors border border-emerald-600/30">
                                    <MessageSquare size={14} /> Send WhatsApp
                                  </button>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs uppercase text-gray-500 font-bold mb-3 flex items-center gap-2">
                                  <MapPin size={14} /> Delivery Address
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">Street:</span> <span className="text-white">{o.street_address || '—'}</span></p>
                                  <p><span className="text-gray-500">City:</span> <span className="text-white">{o.city || '—'}</span></p>
                                  <p><span className="text-gray-500">District:</span> <span className="text-white">{o.district || '—'}</span></p>
                                  <p><span className="text-gray-500">Wilaya:</span> <span className="text-white">{o.wilaya_id || '—'}</span></p>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs uppercase text-gray-500 font-bold mb-3 flex items-center gap-2">
                                  <DollarSign size={14} /> Financial
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">COD Amount:</span> <span className="text-arrow-green font-bold">{o.cod_amount.toLocaleString()} DA</span></p>
                                  <p><span className="text-gray-500">Delivery Price:</span> <span className="text-white">{o.delivery_price.toLocaleString()} DA</span></p>
                                  <p><span className="text-gray-500">Return Price:</span> <span className="text-white">{o.return_price.toLocaleString()} DA</span></p>
                                  <p><span className="text-gray-500">Weight:</span> <span className="text-white">{o.weight ? `${o.weight} kg` : '—'}</span></p>
                                </div>
                                {o.product_description && (
                                  <div className="mt-3">
                                    <h4 className="text-xs uppercase text-gray-500 font-bold mb-2">Products</h4>
                                    <p className="text-sm text-gray-300">{o.product_description}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-4 py-2 bg-neutral-800 rounded-xl text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-4 py-2 bg-neutral-800 rounded-xl text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* WhatsApp Modal */}
        {waModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setWaModal(null)}>
            <div className="bg-arrow-dark border border-neutral-700 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Send WhatsApp</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                To: <span className="text-white">{waModal.order.client_name || 'Client'}</span> — <span className="font-mono">{waModal.order.client_phone}</span>
              </p>
              <textarea
                value={waText}
                onChange={e => setWaText(e.target.value)}
                rows={4}
                className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none mb-4"
                placeholder="Type your message..."
              />
              {waResult && (
                <p className={`text-sm mb-4 ${waResult.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>{waResult}</p>
              )}
              <div className="flex gap-3">
                <button onClick={handleSendWa} disabled={waSending || !waText.trim() || !user?.wa_sender_api_key}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                  {waSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {waSending ? 'Sending...' : 'Send'}
                </button>
                <button onClick={() => setWaModal(null)}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
              </div>
              {!user?.wa_sender_api_key && (
                <p className="text-xs text-red-400 mt-3">No WaSender API key configured. Add it in Admin page.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Crm;
