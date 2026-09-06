import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResellerParcel, ZrCredentials, ZrParcel, CrmOrder } from '../types';
import { getCrmOrders } from '../services/crmService';
import { getMyParcels } from '../services/resellerApi';
import { generateIndividualLabels, generateMultipleLabels, getParcelByTracking, createParcelRefund, createParcelExchange, createParcelModificationRequest } from '../services/zrExpressApi';

import LoadingSpinner from './LoadingSpinner';
import StatusBadge from './StatusBadge';
import { openBulkPrint } from '../lib/bulkPrint';
import {
  Search, Plus, Layers,
  Printer, CheckSquare, Square, X,
  RotateCcw, ArrowLeftRight, FileEdit, Loader2, FileText,
  Package, Truck, CheckCircle, DollarSign, Clock, Filter
} from 'lucide-react';

interface ZrSubAccountContentProps {
  profileId: string;
  masterId?: string | null;
  zrCredentials?: ZrCredentials | null;
}

const ZrSubAccountContent: React.FC<ZrSubAccountContentProps> = ({ profileId, masterId, zrCredentials }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Legacy reseller parcel state (for backward compat)
  const [legacyParcels, setLegacyParcels] = useState<ResellerParcel[]>([]);
  const [labelLoading, setLabelLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [actionModal, setActionModal] = useState<'refund' | 'exchange' | 'modify' | null>(null);
  const [actionParcel, setActionParcel] = useState<ZrParcel | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchingParcel, setFetchingParcel] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundDeliveryType, setRefundDeliveryType] = useState<'home' | 'pickup-point'>('home');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangeDescription, setExchangeDescription] = useState('');
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyPhone, setModifyPhone] = useState('');

  // Statuses for filter
  const [statuses, setStatuses] = useState<string[]>([]);

  const openActionModal = async (order: CrmOrder, type: 'refund' | 'exchange' | 'modify') => {
    if (!zrCredentials || !order.zr_parcel_id) return;
    setFetchingParcel(true);
    setError(null);
    try {
      const full = await getParcelByTracking(zrCredentials, order.tracking_number);
      setActionParcel(full);
      if (type === 'refund') { setRefundAmount(String(full.amount)); setRefundDescription(''); setRefundDeliveryType(full.deliveryType === 'pickup-point' ? 'pickup-point' : 'home'); }
      if (type === 'exchange') { setExchangeAmount(String(full.amount)); setExchangeDescription(''); }
      if (type === 'modify') { setModifyAmount(''); setModifyPhone(''); }
      setActionModal(type);
    } catch (err: any) {
      setError('Failed to load parcel data: ' + (err?.message || 'unknown error'));
    }
    setFetchingParcel(false);
  };

  const profileIds = useMemo(() => [profileId], [profileId]);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCrmOrders(profileIds, {
        search: search || undefined,
        status: statusFilter || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setOrders(result.orders);
      setTotalCount(result.total);

      // Also fetch distinct statuses if empty
      if (statuses.length === 0 && result.orders.length > 0) {
        const unique = [...new Set(result.orders.map(o => o.status).filter(Boolean))] as string[];
        setStatuses(unique);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Legacy: also load reseller_parcels for backward compat
  const fetchLegacyParcels = async () => {
    try {
      const data = await getMyParcels(profileId);
      setLegacyParcels(data);
    } catch {}
  };

  useEffect(() => {
    fetchOrders(1);
    fetchLegacyParcels();
  }, [profileId]);

  useEffect(() => {
    setCurrentPage(1);
    fetchOrders(1);
  }, [search, statusFilter]);

  // Sub-accounts only see their own orders (profileId only)

  const totalPages = Math.ceil(totalCount / pageSize);

  // LEGACY: reseller parcel actions (kept for backward compat)
  const currentLegacyParcels = legacyParcels;
  const allSelected = useMemo(() =>
    currentLegacyParcels.length > 0 && currentLegacyParcels.every(p => selectedIds.has(p.id)),
  [currentLegacyParcels, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentLegacyParcels.map(p => p.id)));
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Main orders table selection (CRM orders)
  const allOrdersSelected = orders.length > 0 && orders.every(o => selectedOrderIds.has(o.id));
  const toggleSelectOrder = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedOrderIds(next);
  };
  const toggleSelectAllOrders = () => {
    if (allOrdersSelected) setSelectedOrderIds(new Set());
    else setSelectedOrderIds(new Set(orders.map(o => o.id)));
  };
  const clearSelectedOrders = () => setSelectedOrderIds(new Set());

  const handleBulkPrintLabels = async () => {
    if (!zrCredentials) return;
    const selected = currentLegacyParcels.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      const result = await generateMultipleLabels(zrCredentials, selected.map(p => p.tracking_number));
      if (result.fileUrl) window.open(result.fileUrl, '_blank');
      if (result.failedTrackingNumbers.length > 0) setError(`${result.failedTrackingNumbers.length} label(s) failed`);
    } catch (err: any) {
      setError('Bulk label print failed: ' + (err?.message || 'unknown error'));
    }
    setBulkActionLoading(false);
  };

  const handleBulkPrintList = () => {
    const selected = currentLegacyParcels.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    openBulkPrint({
      title: 'Bulk Order List',
      columns: [
        { key: 'tracking', label: 'Tracking' },
        { key: 'state', label: 'State' },
        { key: 'cod', label: 'COD Amount' },
        { key: 'delivery', label: 'Delivery (ZR)' },
        { key: 'date', label: 'Date' },
      ],
      rows: selected.map(p => ({
        tracking: p.tracking_number,
        state: p.state,
        cod: `${Number(p.cod_amount).toLocaleString()} DA`,
        delivery: `${Number(p.zr_delivery_price).toLocaleString()} DA`,
        date: new Date(p.created_at).toLocaleDateString(),
      })),
    });
  };

  const handleBulkPrintOrders = () => {
    const selected = orders.filter(o => selectedOrderIds.has(o.id));
    if (selected.length === 0) return;
    openBulkPrint({
      title: 'Bulk Order List',
      columns: [
        { key: 'tracking', label: 'Tracking' },
        { key: 'client', label: 'Client' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
        { key: 'cod', label: 'COD Amount' },
        { key: 'delivery', label: 'Delivery (ZR)' },
        { key: 'product', label: 'Product' },
        { key: 'date', label: 'Date' },
      ],
      rows: selected.map(o => ({
        tracking: o.tracking_number,
        client: o.client_name || '',
        phone: o.client_phone || '',
        status: o.status || '',
        cod: o.cod_amount ? `${Number(o.cod_amount).toLocaleString()} DA` : '',
        delivery: o.delivery_price ? `${Number(o.delivery_price).toLocaleString()} DA` : '',
        product: o.product_description || '',
        date: new Date(o.created_at).toLocaleDateString(),
      })),
    });
  };

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d.toDateString() === new Date().toDateString();
  });

  const deliveredCount = orders.filter(o =>
    o.status === 'Livré' || o.status === 'livre_non_encaisse' || o.status === 'paye_et_archive'
  ).length;

  const inTransitCount = orders.filter(o =>
    ['en_livraison', 'en_preparation', 'vers_wilaya', 'en_hub', 'vers_hub'].includes(o.status || '')
  ).length;

  if (loading && orders.length === 0) {
    return <div className="min-h-[400px] flex items-center justify-center"><LoadingSpinner text="Loading orders..." /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-amber-900/10 border-b border-amber-600/30 sticky top-[80px] z-30 backdrop-blur-md">
        <div className="max-w-full mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers size={24} className="text-amber-400" /> My Orders
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{totalCount} orders</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Stats Cards */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gradient-to-br from-amber-900/20 to-neutral-900 border border-amber-600/20 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{totalCount.toLocaleString()}</div>
              <div className="text-xs text-amber-400/70 mt-1 flex items-center gap-1"><Package size={12} /> Total Orders</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-900/20 to-neutral-900 border border-emerald-600/20 rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-400">{deliveredCount.toLocaleString()}</div>
              <div className="text-xs text-emerald-400/70 mt-1 flex items-center gap-1"><CheckCircle size={12} /> Delivered</div>
            </div>
            <div className="bg-gradient-to-br from-blue-900/20 to-neutral-900 border border-blue-600/20 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">{inTransitCount.toLocaleString()}</div>
              <div className="text-xs text-blue-400/70 mt-1 flex items-center gap-1"><Truck size={12} /> In Transit</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-900/20 to-neutral-900 border border-cyan-600/20 rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">{todayOrders.length.toLocaleString()}</div>
              <div className="text-xs text-cyan-400/70 mt-1 flex items-center gap-1"><Clock size={12} /> Today</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/zr-create-order')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-4 py-2.5 rounded-xl font-bold transition-colors w-fit"
          >
            <Plus size={18} /> New Order
          </button>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search tracking, client, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          {statuses.length > 0 && (
            <div className="relative">
              <Filter className="absolute left-3 top-3 text-gray-500" size={16} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white pl-10 pr-8 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-sm appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="">All Statuses</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">{error}</div>
        )}

        {/* Bulk Action Bar (legacy) */}
        {zrCredentials && selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-amber-900/20 border border-amber-600/30 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-amber-400" />
              <span className="text-sm text-amber-200 font-medium">{selectedIds.size} selected (legacy)</span>
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"><X size={14} /> Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkPrintLabels} disabled={bulkActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs font-bold transition-colors disabled:opacity-30">
                <Printer size={14} /> {bulkActionLoading ? 'Processing...' : 'Print Labels'}
              </button>
              <button onClick={handleBulkPrintList} disabled={bulkActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-30">
                <FileText size={14} /> Print List
              </button>
            </div>
          </div>
        )}

        {/* Bulk Action Bar (main orders) */}
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center justify-between bg-amber-900/20 border border-amber-600/30 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-amber-400" />
              <span className="text-sm text-amber-200 font-medium">{selectedOrderIds.size} selected</span>
              <button onClick={clearSelectedOrders} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"><X size={14} /> Clear</button>
            </div>
            <button onClick={handleBulkPrintOrders} disabled={bulkActionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-30">
              <FileText size={14} /> Print List
            </button>
          </div>
        )}

        {/* Orders Table (CRM) */}
        <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <th className="p-4 w-10">
                    <input type="checkbox" checked={allOrdersSelected} onChange={toggleSelectAllOrders} className="accent-amber-500" />
                  </th>
                  <th className="p-4 font-semibold">Tracking</th>
                  <th className="p-4 font-semibold">Client</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">COD</th>
                  <th className="p-4 font-semibold">Delivery</th>
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold text-right">Date</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {orders.length > 0 ? (
                  orders.map(order => (
                    <tr key={order.id} className={`hover:bg-neutral-900/50 transition-colors group ${selectedOrderIds.has(order.id) ? 'bg-amber-900/10' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleSelectOrder(order.id)} className="accent-amber-500" />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white font-mono text-xs">{order.tracking_number}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-medium text-sm">{order.client_name || '—'}</div>
                        {order.client_phone && <div className="text-gray-500 text-xs mt-0.5">{order.client_phone}</div>}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={order.status || 'Unknown'} />
                      </td>
                      <td className="p-4 font-mono text-amber-400 font-medium">
                        {order.cod_amount ? `${order.cod_amount.toLocaleString()} DA` : '—'}
                      </td>
                      <td className="p-4 font-mono text-gray-400 text-xs">
                        {order.delivery_price ? `${order.delivery_price.toLocaleString()} DA` : '—'}
                      </td>
                      <td className="p-4 text-gray-400 max-w-[150px] truncate text-xs" title={order.product_description || ''}>
                        {order.product_description || '—'}
                      </td>
                      <td className="p-4 text-right text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {order.zr_parcel_id && zrCredentials && (
                            <>
                              <button
                                onClick={() => openActionModal(order, 'refund')}
                                className="p-1.5 hover:bg-red-600/20 rounded-lg text-red-400 transition-colors"
                                title="Refund"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => openActionModal(order, 'exchange')}
                                className="p-1.5 hover:bg-blue-600/20 rounded-lg text-blue-400 transition-colors"
                                title="Exchange"
                              >
                                <ArrowLeftRight size={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => navigate(`/track?tracking=${order.tracking_number}`)}
                            className="p-1.5 hover:bg-amber-600/20 rounded-lg text-amber-400 transition-colors"
                            title="Track"
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No orders found. Ask your master account to sync orders from ZR Express.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex justify-center items-center gap-2">
              <button
                onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); fetchOrders(p); }}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30"
              >Prev</button>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => { const p = Math.min(totalPages, currentPage + 1); setCurrentPage(p); fetchOrders(p); }}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30"
              >Next</button>
            </div>
          )}
        </div>

        {/* Legacy Reseller Parcels Table (hidden by default, only shown if has data) */}
        {legacyParcels.length > 0 && (
          <details className="mt-8 group">
            <summary className="cursor-pointer text-sm text-arrow-gray hover:text-arrow-light transition-colors flex items-center gap-2 mb-4">
              <span className="font-medium">Legacy Reseller Parcels ({legacyParcels.length})</span>
            </summary>
            <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                      {zrCredentials && <th className="p-4 w-10"><button onClick={toggleSelectAll} className="text-gray-500 hover:text-amber-400 transition-colors">{allSelected ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}</button></th>}
                      <th className="p-4 font-semibold">Tracking</th>
                      <th className="p-4 font-semibold">State</th>
                      <th className="p-4 font-semibold">COD</th>
                      <th className="p-4 font-semibold">Delivery</th>
                      <th className="p-4 font-semibold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-sm">
                    {currentLegacyParcels.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-900/50">
                        {zrCredentials && <td className="p-4"><button onClick={() => toggleSelect(p.id)} className="text-gray-500 hover:text-amber-400">{selectedIds.has(p.id) ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}</button></td>}
                        <td className="p-4 font-bold text-white font-mono text-xs">{p.tracking_number}</td>
                        <td className="p-4"><StatusBadge status={p.state} /></td>
                        <td className="p-4 font-mono text-amber-400">{p.cod_amount.toLocaleString()} DA</td>
                        <td className="p-4 font-mono text-gray-400 text-xs">{p.zr_delivery_price.toLocaleString()} DA</td>
                        <td className="p-4 text-right text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        )}

        {/* Action Modals (legacy) */}
        {actionModal === 'refund' && actionParcel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><RotateCcw size={18} className="text-red-400" /> Create Refund</h3>
                <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{actionParcel.trackingNumber}</div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (DA)</label>
                <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Type</label>
                <select value={refundDeliveryType} onChange={e => setRefundDeliveryType(e.target.value as any)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm">
                  <option value="home">Home</option>
                  <option value="pickup-point">Pickup Point</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <input type="text" value={refundDescription} onChange={e => setRefundDescription(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setActionModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!actionParcel || actionLoading) return;
                  setActionLoading(true);
                  setError(null);
                  try {
                    await createParcelRefund(zrCredentials!, {
                      customer: { customerId: actionParcel.customer.customerId, name: actionParcel.customer.name, phone: { number1: actionParcel.customer.phone.number1 } },
                      deliveryAddress: { cityTerritoryId: actionParcel.deliveryAddress.cityTerritoryId, districtTerritoryId: actionParcel.deliveryAddress.districtTerritoryId, street: actionParcel.deliveryAddress.street },
                      hubId: actionParcel.deliveryAddress.hubId,
                      deliveryType: refundDeliveryType,
                      description: refundDescription || 'Refund',
                      amount: Number(refundAmount),
                    });
                    setActionModal(null);
                    setError('Refund created successfully');
                  } catch (err: any) { setError('Refund failed: ' + (err?.message || 'unknown error')); }
                  setActionLoading(false);
                }} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-30">
                  {actionLoading ? 'Creating...' : 'Create Refund'}
                </button>
              </div>
            </div>
          </div>
        )}

        {actionModal === 'exchange' && actionParcel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ArrowLeftRight size={18} className="text-blue-400" /> Create Exchange</h3>
                <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{actionParcel.trackingNumber}</div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-2">Amount (DA)</label><input type="number" value={exchangeAmount} onChange={e => setExchangeAmount(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" /></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-2">Description</label><input type="text" value={exchangeDescription} onChange={e => setExchangeDescription(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" /></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setActionModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!actionParcel || actionLoading) return;
                  setActionLoading(true);
                  setError(null);
                  try {
                    const products = (actionParcel.orderedProducts || []).length > 0
                      ? actionParcel.orderedProducts.map(p => ({ productId: p.productId, productName: p.productName, unitPrice: p.unitPrice, quantity: p.quantity, length: p.dimensions?.length || 10, width: p.dimensions?.width || 10, height: p.dimensions?.height || 10, stockType: p.stockType || 'none' }))
                      : [{ productName: 'Exchange', unitPrice: Number(exchangeAmount), quantity: 1, length: 10, width: 10, height: 10, stockType: 'none' }];
                    await createParcelExchange(zrCredentials!, {
                      customer: { customerId: actionParcel.customer.customerId, name: actionParcel.customer.name, phone: { number1: actionParcel.customer.phone.number1 } },
                      orderedProducts: products,
                      weight: { weight: actionParcel.weight?.weight || 0.5 },
                      originalParcelId: actionParcel.id,
                      amount: Number(exchangeAmount),
                      description: exchangeDescription || 'Exchange',
                    });
                    setActionModal(null);
                    setError('Exchange created successfully');
                  } catch (err: any) { setError('Exchange failed: ' + (err?.message || 'unknown error')); }
                  setActionLoading(false);
                }} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-30">
                  {actionLoading ? 'Creating...' : 'Create Exchange'}
                </button>
              </div>
            </div>
          </div>
        )}

        {actionModal === 'modify' && actionParcel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileEdit size={18} className="text-emerald-400" /> Modification Request</h3>
                <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{actionParcel.trackingNumber}</div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-2">New Amount (DA)</label><input type="number" value={modifyAmount} onChange={e => setModifyAmount(e.target.value)} placeholder={`Current: ${actionParcel.amount}`} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" /></div>
              <div className="mb-6"><label className="block text-sm font-medium text-gray-300 mb-2">New Phone</label><input type="text" value={modifyPhone} onChange={e => setModifyPhone(e.target.value)} placeholder={`Current: ${actionParcel.customer.phone.number1}`} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" /></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setActionModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!actionParcel || actionLoading) return;
                  setActionLoading(true);
                  setError(null);
                  try {
                    await createParcelModificationRequest(zrCredentials!, {
                      parcelId: actionParcel.id,
                      ...(modifyAmount ? { amount: Number(modifyAmount) } : {}),
                      ...(modifyPhone ? { phone: { number1: modifyPhone } } : {}),
                    });
                    setActionModal(null);
                    setError('Modification request submitted');
                  } catch (err: any) { setError('Modification failed: ' + (err?.message || 'unknown error')); }
                  setActionLoading(false);
                }} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-30">
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZrSubAccountContent;
