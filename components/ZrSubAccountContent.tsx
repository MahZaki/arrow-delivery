import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResellerParcel, ZrCredentials, ZrParcel } from '../types';
import { getMyParcels } from '../services/resellerApi';
import { generateIndividualLabels, generateMultipleLabels, getParcelByTracking, createParcelRefund, createParcelExchange, createParcelModificationRequest } from '../services/zrExpressApi';
import LoadingSpinner from './LoadingSpinner';
import {
  RefreshCw, Search,
  Plus, Layers,
  Printer, CheckSquare, Square, X,
  RotateCcw, ArrowLeftRight, FileEdit, Loader2
} from 'lucide-react';

interface ZrSubAccountContentProps {
  profileId: string;
  zrCredentials?: ZrCredentials | null;
}

const ZrSubAccountContent: React.FC<ZrSubAccountContentProps> = ({ profileId, zrCredentials }) => {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<ResellerParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelLoading, setLabelLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const openActionModal = async (parcel: ResellerParcel, type: 'refund' | 'exchange' | 'modify') => {
    if (!zrCredentials) return;
    setFetchingParcel(true);
    setError(null);
    try {
      const full = await getParcelByTracking(zrCredentials, parcel.tracking_number);
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

  const fetchParcels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyParcels(profileId);
      setParcels(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parcels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [profileId]);

  const currentParcels = parcels;
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
    if (!zrCredentials) return;
    const selected = currentParcels.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    setBulkActionLoading(true);
    setError(null);
    try {
      const result = await generateMultipleLabels(zrCredentials, selected.map(p => p.tracking_number));
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

  if (loading) {
    return <div className="min-h-[400px] flex items-center justify-center"><LoadingSpinner text="Loading your parcels..." /></div>;
  }

  return (
    <div>
      <div className="bg-amber-900/10 border-b border-amber-600/30 sticky top-[80px] z-30 backdrop-blur-md">
        <div className="max-w-full mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers size={24} className="text-amber-400" /> My Parcels
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{parcels.length} parcels</span>
            <button
              onClick={fetchParcels}
              disabled={loading}
              className="bg-neutral-900 hover:bg-neutral-800 text-white border border-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/zr-create-order')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-4 py-2.5 rounded-xl font-bold transition-colors w-fit"
          >
            <Plus size={18} /> New Parcel
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">{error}</div>
        )}

        {/* Bulk Action Bar */}
        {zrCredentials && selectedIds.size > 0 && (
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
            </div>
          </div>
        )}

        <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                  {zrCredentials && (
                    <th className="p-4 w-10">
                      <button onClick={toggleSelectAll} className="text-gray-500 hover:text-amber-400 transition-colors">
                        {allSelected ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  <th className="p-4 font-semibold">Tracking</th>
                  <th className="p-4 font-semibold">State</th>
                  <th className="p-4 font-semibold">COD Amount</th>
                  <th className="p-4 font-semibold">Delivery Price</th>
                  <th className="p-4 font-semibold text-right">Date</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {parcels.length > 0 ? (
                  parcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-neutral-900/50 transition-colors group">
                      {zrCredentials && (
                        <td className="p-4">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelect(parcel.id); }} className="text-gray-500 hover:text-amber-400 transition-colors">
                            {selectedIds.has(parcel.id) ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}
                          </button>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="font-bold text-white font-mono">{parcel.tracking_number}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm text-white bg-amber-700">
                          {parcel.state.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-medium text-amber-400">
                        {(parcel.cod_amount ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-4 font-mono text-gray-400">
                        {(parcel.my_delivery_price ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-4 text-right text-gray-500">
                        {new Date(parcel.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/track?tracking=${parcel.tracking_number}&carrier=zrexpress`)}
                            className="p-2 hover:bg-amber-600/20 rounded-lg text-amber-400 transition-colors"
                            title="View Details"
                          >
                            <Search size={18} />
                          </button>
                          {zrCredentials && (
                            <>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (labelLoading) return;
                                  setLabelLoading(parcel.tracking_number);
                                  try {
                                    const result = await generateIndividualLabels(zrCredentials, { trackingNumbers: [parcel.tracking_number] });
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
                                {labelLoading === parcel.tracking_number ? (
                                  <><RefreshCw size={14} className="animate-spin" /> Label</>
                                ) : (
                                  <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Label</>
                                )}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openActionModal(parcel, 'refund'); }}
                                disabled={fetchingParcel}
                                className="p-2 hover:bg-red-600/20 rounded-lg text-red-400 transition-colors disabled:opacity-30"
                                title="Refund"
                              >
                                {fetchingParcel ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openActionModal(parcel, 'exchange'); }}
                                disabled={fetchingParcel}
                                className="p-2 hover:bg-blue-600/20 rounded-lg text-blue-400 transition-colors disabled:opacity-30"
                                title="Exchange"
                              >
                                {fetchingParcel ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openActionModal(parcel, 'modify'); }}
                                disabled={fetchingParcel}
                                className="p-2 hover:bg-emerald-600/20 rounded-lg text-emerald-400 transition-colors disabled:opacity-30"
                                title="Modify"
                              >
                                {fetchingParcel ? <Loader2 size={16} className="animate-spin" /> : <FileEdit size={16} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={zrCredentials ? 7 : 6} className="p-12 text-center text-gray-500">
                      No parcels yet. Create your first one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        {/* Refund Modal */}
        {actionModal === 'refund' && actionParcel && zrCredentials && (
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
                  setActionLoading(true); setError(null);
                  try {
                    await createParcelRefund(zrCredentials, {
                      customer: { customerId: actionParcel.customer.customerId, name: actionParcel.customer.name, phone: { number1: actionParcel.customer.phone.number1 } },
                      deliveryAddress: { cityTerritoryId: actionParcel.deliveryAddress.cityTerritoryId, districtTerritoryId: actionParcel.deliveryAddress.districtTerritoryId, street: actionParcel.deliveryAddress.street },
                      hubId: actionParcel.deliveryAddress.hubId,
                      deliveryType: refundDeliveryType,
                      description: refundDescription || 'Refund',
                      amount: Number(refundAmount),
                    });
                    setActionModal(null); await fetchParcels(); setError('Refund created successfully');
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
        {actionModal === 'exchange' && actionParcel && zrCredentials && (
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
                  setActionLoading(true); setError(null);
                  try {
                    const products = (actionParcel.orderedProducts || []).length > 0
                      ? actionParcel.orderedProducts.map(p => ({ productId: p.productId, productName: p.productName, unitPrice: p.unitPrice, quantity: p.quantity, length: p.dimensions?.length || 10, width: p.dimensions?.width || 10, height: p.dimensions?.height || 10, stockType: p.stockType || 'none' }))
                      : [{ productName: 'Exchange', unitPrice: Number(exchangeAmount), quantity: 1, length: 10, width: 10, height: 10, stockType: 'none' }];
                    await createParcelExchange(zrCredentials, {
                      customer: { customerId: actionParcel.customer.customerId, name: actionParcel.customer.name, phone: { number1: actionParcel.customer.phone.number1 } },
                      orderedProducts: products,
                      weight: { weight: actionParcel.weight?.weight || 0.5 },
                      originalParcelId: actionParcel.id,
                      amount: Number(exchangeAmount),
                      description: exchangeDescription || 'Exchange',
                    });
                    setActionModal(null); await fetchParcels(); setError('Exchange created successfully');
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
        {actionModal === 'modify' && actionParcel && zrCredentials && (
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
                  setActionLoading(true); setError(null);
                  try {
                    await createParcelModificationRequest(zrCredentials, {
                      parcelId: actionParcel.id,
                      ...(modifyAmount ? { amount: Number(modifyAmount) } : {}),
                      ...(modifyPhone ? { phone: { number1: modifyPhone } } : {}),
                    });
                    setActionModal(null); await fetchParcels(); setError('Modification request submitted');
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
    </div>
  );
};

export default ZrSubAccountContent;
