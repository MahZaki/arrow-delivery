import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZrParcel, ZrCredentials } from '../types';
import {
  searchParcels, clearZrCache, generateIndividualLabels,
  generateMultipleLabels, updateParcelAmount, updateParcelCustomer,
  deleteBulkParcels, createParcelRefund, createParcelExchange,
  createParcelModificationRequest
} from '../services/zrExpressApi';
import LoadingSpinner from './LoadingSpinner';
import {
  RefreshCw, Search,
  Plus, ChevronDown, Calendar, Layers, List,
  X, Printer, Edit3, Trash2, CheckSquare, Square,
  RotateCcw, ArrowLeftRight, FileEdit
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
  const [labelLoading, setLabelLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<'refund' | 'exchange' | 'modify' | null>(null);
  const [actionParcel, setActionParcel] = useState<ZrParcel | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundDeliveryType, setRefundDeliveryType] = useState<'home' | 'pickup-point'>('home');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangeDescription, setExchangeDescription] = useState('');
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyPhone, setModifyPhone] = useState('');
  const [editParcel, setEditParcel] = useState<ZrParcel | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  const allSelected = useMemo(() =>
    currentParcels.length > 0 && currentParcels.every(p => selectedIds.has(p.id)),
  [currentParcels, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentParcels.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkPrintLabels = async () => {
    const selected = currentParcels.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      const result = await generateMultipleLabels(credentials, selected.map(p => p.trackingNumber));
      if (result.fileUrl) {
        window.open(result.fileUrl, '_blank');
      }
      if (result.failedTrackingNumbers.length > 0) {
        setError(`${result.failedTrackingNumbers.length} label(s) failed: ${result.failedTrackingNumbers.join(', ')}`);
      }
    } catch (err: any) {
      setError('Bulk label print failed: ' + (err?.message || 'unknown error'));
    }
    setBulkActionLoading(false);
  };

  const handleBulkDelete = async () => {
    const selected = currentParcels.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      const result = await deleteBulkParcels(credentials, selected.map(p => p.id));
      if (result.successCount > 0) {
        clearSelection();
        clearZrCache();
        await fetchParcels(currentPage);
      }
      if (result.failureCount > 0) {
        const msgs = result.failures.map(f => f.errorMessage).join('; ');
        setError(`Deleted ${result.successCount}, ${result.failureCount} failed: ${msgs}`);
      }
    } catch (err: any) {
      setError('Bulk delete failed: ' + (err?.message || 'unknown error'));
    }
    setBulkActionLoading(false);
    setShowDeleteConfirm(false);
  };

  const openEditModal = (parcel: ZrParcel) => {
    setEditParcel(parcel);
    setEditAmount(String(parcel.amount));
    setEditName(parcel.customer.name);
    setEditPhone(parcel.customer.phone.number1);
  };

  const closeEditModal = () => {
    setEditParcel(null);
    setEditAmount('');
    setEditName('');
    setEditPhone('');
  };

  const handleSaveAmount = async () => {
    if (!editParcel) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      await updateParcelAmount(credentials, editParcel.id, {
        parcelId: editParcel.id,
        amount: Number(editAmount),
      });
      closeEditModal();
      clearZrCache();
      await fetchParcels(currentPage);
    } catch (err: any) {
      setError('Update amount failed: ' + (err?.message || 'unknown error'));
    }
    setBulkActionLoading(false);
  };

  const handleSaveCustomer = async () => {
    if (!editParcel) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      await updateParcelCustomer(credentials, editParcel.id, {
        parcelId: editParcel.id,
        name: editName,
        phone: editPhone,
      });
      closeEditModal();
      clearZrCache();
      await fetchParcels(currentPage);
    } catch (err: any) {
      setError('Update customer failed: ' + (err?.message || 'unknown error'));
    }
    setBulkActionLoading(false);
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

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-amber-900/20 border border-amber-600/30 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-amber-400" />
              <span className="text-sm text-amber-200 font-medium">{selectedIds.size} selected</span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <X size={14} /> Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkPrintLabels}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
              >
                <Printer size={14} />
                {bulkActionLoading ? 'Processing...' : 'Print Labels'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Delete {selectedIds.size} parcel(s)?</h3>
              <p className="text-sm text-gray-400 mb-6">This action cannot be undone. Exchange/return parcels cannot be deleted.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-30"
                >
                  {bulkActionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Parcels Table */}
        <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <th className="p-4 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-500 hover:text-amber-400 transition-colors">
                      {allSelected ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}
                    </button>
                  </th>
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
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(parcel.id); }} className="text-gray-500 hover:text-amber-400 transition-colors">
                          {selectedIds.has(parcel.id) ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}
                        </button>
                      </td>
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
                        {(parcel.amount ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-4 font-mono text-gray-400">
                        {(parcel.deliveryPrice ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-4 text-right text-gray-500">
                        {new Date(parcel.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(parcel)}
                            className="p-2 hover:bg-blue-600/20 rounded-lg text-blue-400 transition-colors"
                            title="Edit Parcel"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => navigate(`/track?tracking=${parcel.trackingNumber}&carrier=zrexpress`)}
                            className="p-2 hover:bg-amber-600/20 rounded-lg text-amber-400 transition-colors"
                            title="View Details"
                          >
                            <Search size={18} />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (labelLoading) return;
                              setLabelLoading(parcel.trackingNumber);
                              try {
                                const result = await generateIndividualLabels(credentials, { trackingNumbers: [parcel.trackingNumber] });
                                if (result.parcelLabelFiles.length > 0) {
                                  window.open(result.parcelLabelFiles[0].fileUrl, '_blank');
                                } else {
                                  setError('Label not available for this parcel');
                                }
                              } catch (err: any) {
                                setError('Print failed: ' + (err?.message || 'unknown error'));
                              }
                              setLabelLoading(null);
                            }}
                            disabled={labelLoading !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 rounded-lg text-amber-400 text-xs font-bold transition-colors disabled:opacity-30"
                            title="Print Label"
                          >
                            {labelLoading === parcel.trackingNumber ? (
                              <><RefreshCw size={14} className="animate-spin" /> Label</>
                            ) : (
                              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Label</>
                            )}
                          </button>
                          <button
                            onClick={() => { setActionParcel(parcel); setRefundAmount(String(parcel.amount)); setRefundDescription(''); setRefundDeliveryType(parcel.deliveryType === 'pickup-point' ? 'pickup-point' : 'home'); setActionModal('refund'); }}
                            className="p-2 hover:bg-red-600/20 rounded-lg text-red-400 transition-colors"
                            title="Refund"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => { setActionParcel(parcel); setExchangeAmount(String(parcel.amount)); setExchangeDescription(''); setActionModal('exchange'); }}
                            className="p-2 hover:bg-blue-600/20 rounded-lg text-blue-400 transition-colors"
                            title="Exchange"
                          >
                            <ArrowLeftRight size={16} />
                          </button>
                          <button
                            onClick={() => { setActionParcel(parcel); setModifyAmount(''); setModifyPhone(''); setActionModal('modify'); }}
                            className="p-2 hover:bg-emerald-600/20 rounded-lg text-emerald-400 transition-colors"
                            title="Modify"
                          >
                            <FileEdit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-500">
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

        {/* Edit Modal */}
        {editParcel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closeEditModal}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-amber-400" />
                  Edit Parcel
                </h3>
                <button onClick={closeEditModal} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">
                {editParcel.trackingNumber}
              </div>

              {/* Amount Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Amount (DA)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    min="0"
                    max="150000"
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleSaveAmount}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
                  >
                    {bulkActionLoading ? '...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Customer Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm mb-3"
                />
                <label className="block text-sm font-medium text-gray-300 mb-2">Customer Phone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleSaveCustomer}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
                  >
                    {bulkActionLoading ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
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
                    await createParcelRefund(credentials, {
                      customer: { customerId: actionParcel.customer.customerId, name: actionParcel.customer.name, phone: { number1: actionParcel.customer.phone.number1 } },
                      deliveryAddress: { cityTerritoryId: actionParcel.deliveryAddress.cityTerritoryId, districtTerritoryId: actionParcel.deliveryAddress.districtTerritoryId, street: actionParcel.deliveryAddress.street },
                      hubId: actionParcel.deliveryAddress.hubId,
                      deliveryType: refundDeliveryType,
                      description: refundDescription || 'Refund',
                      amount: Number(refundAmount),
                    });
                    setActionModal(null);
                    clearZrCache();
                    await fetchParcels(currentPage);
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

        {/* Exchange Modal */}
        {actionModal === 'exchange' && actionParcel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ArrowLeftRight size={18} className="text-blue-400" /> Create Exchange</h3>
                <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{actionParcel.trackingNumber}</div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (DA)</label>
                <input type="number" value={exchangeAmount} onChange={e => setExchangeAmount(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <input type="text" value={exchangeDescription} onChange={e => setExchangeDescription(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="mb-6 text-xs text-gray-500 bg-neutral-800 rounded-lg px-3 py-2">
                Creates an exchange parcel linked to the original. Products and weight from the original parcel will be used.
              </div>
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
                    await createParcelExchange(credentials, {
                      customer: { customerId: actionParcel.customer.customerId, name: actionParcel.customer.name, phone: { number1: actionParcel.customer.phone.number1 } },
                      orderedProducts: products,
                      weight: { weight: actionParcel.weight?.weight || 0.5 },
                      originalParcelId: actionParcel.id,
                      amount: Number(exchangeAmount),
                      description: exchangeDescription || 'Exchange',
                    });
                    setActionModal(null);
                    clearZrCache();
                    await fetchParcels(currentPage);
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

        {/* Modify Modal */}
        {actionModal === 'modify' && actionParcel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileEdit size={18} className="text-emerald-400" /> Modification Request</h3>
                <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{actionParcel.trackingNumber}</div>
              <p className="text-xs text-gray-500 mb-4">Request changes after the parcel is beyond "Confirmed au Bureau". Changes are reviewed by the hub.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">New Amount (DA) — leave empty to keep current</label>
                <input type="number" value={modifyAmount} onChange={e => setModifyAmount(e.target.value)} placeholder={`Current: ${actionParcel.amount}`} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">New Phone — leave empty to keep current</label>
                <input type="text" value={modifyPhone} onChange={e => setModifyPhone(e.target.value)} placeholder={`Current: ${actionParcel.customer.phone.number1}`} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setActionModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!actionParcel || actionLoading) return;
                  setActionLoading(true);
                  setError(null);
                  try {
                    await createParcelModificationRequest(credentials, {
                      parcelId: actionParcel.id,
                      ...(modifyAmount ? { amount: Number(modifyAmount) } : {}),
                      ...(modifyPhone ? { phone: { number1: modifyPhone } } : {}),
                    });
                    setActionModal(null);
                    clearZrCache();
                    await fetchParcels(currentPage);
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

export default ZrDashboardContent;
