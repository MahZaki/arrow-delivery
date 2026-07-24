import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CrmOrder } from '../types';
import { getCrmOrders, syncEcotrackOrdersToCrm } from '../services/crmService';
import { fetchOrdersFromApi } from '../services/api';
import {
  Search, ChevronDown, ChevronUp, Package, Truck,
  Phone, MapPin, DollarSign, Calendar, User, Box,
  Loader2, Filter, X, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

const Crm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<'all' | 'ecotrack' | 'zrexpress'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const pageSize = 50;

  const handleSync = async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      let syncedCount = 0;
      if (user.api_token) {
        const orders = await fetchOrdersFromApi(user.api_token);
        syncedCount += await syncEcotrackOrdersToCrm(user.id, orders);
      }
      if (syncedCount > 0 || user.api_token) {
        await loadOrders();
      }
      setSyncing(false);
    } catch (err: any) {
      setError('Sync failed: ' + err.message);
      setSyncing(false);
    }
  };

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCrmOrders(user.id, {
        carrier: carrierFilter === 'all' ? undefined : carrierFilter,
        search: search || undefined,
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
  }, [user?.id, carrierFilter, search, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(0);
  }, [search, carrierFilter]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-arrow-black pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package size={28} className="text-arrow-green" /> CRM Orders
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-arrow-green/20 hover:bg-arrow-green/30 text-arrow-green rounded-xl transition-colors disabled:opacity-50 text-sm font-bold border border-arrow-green/30">
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <div className="text-sm text-gray-400">
              <span className="font-bold text-white">{total}</span> orders
            </div>
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

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-300 mb-6">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-arrow-green" />
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
                          <td colSpan={9} className="px-8 py-6 bg-neutral-900/30">
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
      </div>
    </div>
  );
};

export default Crm;
