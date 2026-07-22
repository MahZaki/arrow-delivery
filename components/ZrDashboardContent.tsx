import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZrParcel, ZrCredentials } from '../types';
import { searchParcels, clearZrCache } from '../services/zrExpressApi';
import LoadingSpinner from './LoadingSpinner';
import {
  Package, Truck, CheckCircle, RefreshCw, Search,
  MapPin, Plus, ChevronDown, Calendar, Layers, List
} from 'lucide-react';

interface ZrDashboardContentProps {
  credentials: ZrCredentials;
}

const PAGE_SIZE = 15;

const ZrDashboardContent: React.FC<ZrDashboardContentProps> = ({ credentials }) => {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<ZrParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchParcels = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchParcels(credentials, {
        pageNumber: page,
        pageSize: PAGE_SIZE,
        orderBy: ['createdAt desc'],
        includeProducts: false,
      });
      setParcels(result.items);
      setTotalCount(result.totalCount);
      setCurrentPage(result.pageNumber);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parcels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels(1);
  }, [credentials.tenantId, credentials.apiKey]);

  const handleForceUpdate = async () => {
    setSyncing(true);
    setError(null);
    try {
      clearZrCache();
      await fetchParcels(currentPage);
    } catch (err: any) {
      setError(`Refresh failed: ${err.message || 'Connection error.'}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredParcels = useMemo(() => {
    return parcels.filter(p => {
      const matchesSearch =
        p.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.customer.phone.number1 && p.customer.phone.number1.includes(search));
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const orderDate = new Date(p.createdAt).getTime();
        if (dateFrom && orderDate < new Date(dateFrom).getTime()) matchesDate = false;
        if (dateTo && orderDate > new Date(dateTo).setHours(23, 59, 59, 999)) matchesDate = false;
      }
      return matchesSearch && matchesDate;
    });
  }, [parcels, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentParcels = filteredParcels;

  const totalAmount = useMemo(() => {
    return parcels.reduce((sum, p) => sum + p.amount, 0);
  }, [parcels]);

  if (loading && parcels.length === 0) {
    return <div className="min-h-[400px] flex items-center justify-center"><LoadingSpinner text="Loading ZR Express parcels..." /></div>;
  }

  return (
    <div>
      {/* Top Header */}
      <div className="bg-amber-900/10 border-b border-amber-600/30 sticky top-[80px] z-30 backdrop-blur-md">
        <div className="max-w-full mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers size={24} className="text-amber-400" /> ZR Express Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {totalCount} parcels · {totalAmount.toLocaleString()} DA total
            </span>
            <button
              onClick={handleForceUpdate}
              disabled={syncing}
              className="bg-neutral-900 hover:bg-neutral-800 text-white border border-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? 'Syncing...' : 'Sync from Network'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-4 py-2.5 rounded-xl font-bold transition-colors"
              >
                <Plus size={18} /> Create <ChevronDown size={14} />
              </button>
              {showAddMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-neutral-900 border border-amber-600 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  <button
                    onClick={() => { setShowAddMenu(false); navigate('/zr-create-order'); }}
                    className="w-full text-left px-4 py-3 hover:bg-amber-600/20 text-white flex items-center gap-2"
                  >
                    <Plus size={16} className="text-amber-400" /> Single Order
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-amber-600/20 text-white flex items-center gap-2">
                    <List size={16} className="text-blue-400" /> Bulk Import
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search tracking, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-gray-500" size={16} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white pl-10 pr-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-sm" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-gray-500" size={16} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white pl-10 pr-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-sm" />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Parcels Table */}
        <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <th className="p-4 font-semibold">Tracking</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">State</th>
                  <th className="p-4 font-semibold">Delivery</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Delivery Price</th>
                  <th className="p-4 font-semibold text-right">Date</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {currentParcels.length > 0 ? (
                  currentParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-neutral-900/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-white font-mono">{parcel.trackingNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-medium">{parcel.customer.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{parcel.customer.phone.number1}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm text-white"
                          style={{ backgroundColor: parcel.state.color ? `#${parcel.state.color}` : '#6b7280' }}
                        >
                          {parcel.state.name.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">
                        {parcel.deliveryType === 'home' ? 'Home' : parcel.deliveryType === 'pickup-point' ? 'Pickup' : parcel.deliveryType}
                        <div className="text-gray-600 text-xs">{parcel.deliveryAddress.city}</div>
                      </td>
                      <td className="p-4 font-mono font-medium text-amber-400">
                        {parcel.amount.toLocaleString()} DA
                      </td>
                      <td className="p-4 font-mono text-gray-400">
                        {parcel.deliveryPrice.toLocaleString()} DA
                      </td>
                      <td className="p-4 text-right text-gray-500">
                        {new Date(parcel.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => navigate(`/track?tracking=${parcel.trackingNumber}&carrier=zrexpress`)}
                          className="p-2 hover:bg-amber-600/20 rounded-lg text-amber-400 transition-colors"
                          title="View Details"
                        >
                          <Search size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No parcels found.'}
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
                onClick={() => fetchParcels(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => fetchParcels(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZrDashboardContent;
