import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, MapPin, Calendar, MessageSquare, AlertCircle, Package, Phone, Wallet, Banknote, Tag, Truck, Printer, X, RefreshCw, RotateCcw, ArrowLeftRight, FileEdit } from 'lucide-react';
import { trackOrder } from '../services/api';
import { getParcelByTracking, getParcelStateHistory, generateIndividualLabels, createParcelRefund, createParcelExchange, createParcelModificationRequest } from '../services/zrExpressApi';
import { TrackingInfo, ZrParcel, ZrCredentials, ZrParcelStateHistoryEntry } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { STATUS_TRANSLATIONS, WILAYAS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const Tracking: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingInfo | null>(null);
  const [zrData, setZrData] = useState<ZrParcel | null>(null);
  const [carrier, setCarrier] = useState<'ecotrack' | 'zrexpress'>('ecotrack');
  const { user, resolveZrCredentials } = useAuth();
  const location = useLocation();

  const [zrCreds, setZrCreds] = useState<ZrCredentials | null>(null);
  const [zrStateHistory, setZrStateHistory] = useState<ZrParcelStateHistoryEntry[]>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [actionModal, setActionModal] = useState<'refund' | 'exchange' | 'modify' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundDeliveryType, setRefundDeliveryType] = useState<'home' | 'pickup-point'>('home');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangeDescription, setExchangeDescription] = useState('');
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyPhone, setModifyPhone] = useState('');

  useEffect(() => {
    resolveZrCredentials().then(setZrCreds);
  }, [resolveZrCredentials]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const trackingParam = searchParams.get('tracking');
    const carrierParam = searchParams.get('carrier');
    if (carrierParam === 'zrexpress' || carrierParam === 'ecotrack') {
      setCarrier(carrierParam);
    }
    if (trackingParam && trackingParam !== trackingNumber) {
        setTrackingNumber(trackingParam);
        handleTrack(trackingParam, carrierParam as 'ecotrack' | 'zrexpress' || 'ecotrack');
    }
  }, [location.search]);

  const handleTrack = async (number: string, selectedCarrier?: string) => {
    if (!number.trim()) return;

    const activeCarrier = (selectedCarrier as 'ecotrack' | 'zrexpress') || carrier;

    if (activeCarrier === 'zrexpress') {
      if (!zrCreds) {
        setError('ZR Express credentials not configured. Please set them in the dashboard.');
        return;
      }
      setLoading(true);
      setError(null);
      setData(null);
      setZrData(null);
      try {
        const parcel = await getParcelByTracking(zrCreds, number);
        setZrData(parcel);
        getParcelStateHistory(zrCreds, parcel.id).then(setZrStateHistory).catch(() => setZrStateHistory([]));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch ZR Express tracking info.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const token = user?.api_token;
    if (!token) {
      setError('No API token configured. Please set your Ecotrack token from the dashboard settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setZrData(null);

    try {
      const result = await trackOrder(number, token);
      if (!result.success && result.message) {
          setError(result.message === 'Commande inexistante' ? 'Order not found. Please verify the tracking number.' : result.message);
      } else if (result.activity && result.activity.length > 0) {
          setData(result);
      } else {
          setError('No tracking information found for this number.');
      }
    } catch (err) {
      setError('System error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack(trackingNumber);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-arrow-green to-arrow-deepGreen bg-clip-text text-transparent mb-4">
            Track Your Order
        </h1>
        <p className="text-arrow-gray">Enter your tracking number to see the real-time status and details of your package.</p>
      </div>

      {/* Carrier Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden inline-flex">
          <button
            onClick={() => setCarrier('ecotrack')}
            className={`px-6 py-2.5 text-sm font-bold transition-colors ${
              carrier === 'ecotrack'
              ? 'bg-arrow-green text-black'
              : 'text-gray-400 hover:text-white'
            }`}
          >
            Arrow Delivery
          </button>
          <button
            onClick={() => setCarrier('zrexpress')}
            className={`px-6 py-2.5 text-sm font-bold transition-colors ${
              carrier === 'zrexpress'
              ? 'bg-amber-500 text-black'
              : 'text-gray-400 hover:text-white'
            }`}
          >
            ZR Express
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className={`bg-arrow-dark border rounded-2xl p-6 shadow-xl mb-8 ${carrier === 'zrexpress' ? 'border-amber-600/30' : 'border-arrow-deepGreen'}`}>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <input 
                type="text" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={carrier === 'zrexpress' ? "e.g., DZ-AL-20251121-00145" : "e.g., ECQFLD2103047673"}
                className="flex-1 bg-neutral-950 border border-arrow-deepGreen text-white px-6 py-4 rounded-xl focus:outline-none focus:border-arrow-green focus:shadow-[0_0_0_2px_rgba(47,191,142,0.2)] transition-all"
                required
            />
            <button 
                type="submit"
                disabled={loading}
                className={`font-bold px-8 py-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-black ${
                  carrier === 'zrexpress'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-arrow-green hover:bg-emerald-400'
                }`}
            >
                {loading ? 'Searching...' : <><Search size={20} /> Track</>}
            </button>
        </form>
      </div>

      {/* Error State */}
      {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 mb-8 animate-fade-in">
              <AlertCircle size={24} />
              <p>{error}</p>
          </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSpinner text="Locating your package..." />}

      {/* ZR Results */}
      {zrData && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-arrow-dark border border-amber-600/30 rounded-2xl p-6 md:p-8 shadow-[0_0_20px_rgba(217,119,6,0.1)]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6 mb-6">
              <div>
                <div className="text-arrow-gray text-sm uppercase tracking-wide mb-1">Tracking Number</div>
                <div className="text-3xl font-bold text-amber-400 tracking-wider font-mono">{zrData.trackingNumber}</div>
                <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                  <Calendar size={12} /> Created on {new Date(zrData.createdAt).toLocaleDateString()}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      if (!zrCreds || labelLoading) return;
                      setLabelLoading(true);
                      try {
                        const result = await generateIndividualLabels(zrCreds, { trackingNumbers: [zrData.trackingNumber] });
                        if (result.parcelLabelFiles.length > 0) {
                          window.open(result.parcelLabelFiles[0].fileUrl, '_blank');
                        }
                      } catch {}
                      setLabelLoading(false);
                    }}
                    disabled={labelLoading}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Printer size={16} />
                    {labelLoading ? 'Generating...' : 'Print Label'}
                  </button>
                  <button
                    onClick={() => { setRefundAmount(String(zrData.amount)); setRefundDescription(''); setRefundDeliveryType(zrData.deliveryType === 'pickup-point' ? 'pickup-point' : 'home'); setActionModal('refund'); }}
                    className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <RotateCcw size={16} /> Refund
                  </button>
                  <button
                    onClick={() => { setExchangeAmount(String(zrData.amount)); setExchangeDescription(''); setActionModal('exchange'); }}
                    className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <ArrowLeftRight size={16} /> Exchange
                  </button>
                  <button
                    onClick={() => { setModifyAmount(''); setModifyPhone(''); setActionModal('modify'); }}
                    className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <FileEdit size={16} /> Modify
                  </button>
                </div>
              </div>
              <span
                className="inline-block px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm text-white"
                style={{ backgroundColor: zrData.state.color ? `#${zrData.state.color}` : '#6b7280' }}
              >
                {zrData.state.name.replace(/_/g, ' ')}
                {zrData.situation && <span className="ml-2 opacity-75">· {zrData.situation.name}</span>}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-amber-600/30 transition-colors">
                <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Customer</div>
                <div className="font-semibold text-white truncate">{zrData.customer.name}</div>
                <div className="text-sm text-amber-400 mt-1 flex items-center gap-1">
                  <Phone size={12} /> {zrData.customer.phone.number1}
                </div>
              </div>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-amber-600/30 transition-colors">
                <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Shipped By</div>
                <div className="font-semibold text-white truncate">{zrData.supplier.supplierName}</div>
              </div>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-amber-600/30 transition-colors">
                <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Delivery</div>
                <div className="font-semibold text-white text-sm">
                  {zrData.deliveryAddress.city} <span className="mx-1 text-amber-400">➜</span> {zrData.deliveryAddress.district}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{zrData.deliveryType === 'home' ? 'Home Delivery' : 'Pickup Point'}</div>
              </div>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-amber-600/30 transition-colors">
                <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Payment</div>
                <div className="font-semibold text-white">{zrData.paymentMethod || 'N/A'}</div>
              </div>
            </div>

            <div className="bg-neutral-900/50 rounded-xl p-6 border border-amber-600/20">
              <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-6 text-lg">
                <Wallet size={20} /> Financial Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase mb-1">Total Amount (COD)</span>
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {(zrData.amount ?? 0).toLocaleString()} <span className="text-sm font-normal text-gray-500">DA</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase mb-1">Delivery Fee</span>
                  <span className="text-xl font-bold text-red-400 tracking-tight">
                    -{(zrData.deliveryPrice ?? 0).toLocaleString()} <span className="text-sm font-normal text-red-400/70">DA</span>
                  </span>
                </div>
                <div className="flex flex-col pt-4 sm:pt-0 sm:border-l sm:border-neutral-800 sm:pl-6">
                  <span className="text-gray-400 text-xs uppercase mb-1 font-bold text-emerald-500">Net</span>
                  <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                    {((zrData.amount ?? 0) - ((zrData.deliveryPrice ?? 0) + (zrData.ReturnPrice || 0))).toLocaleString()} <span className="text-lg font-normal text-emerald-600">DA</span>
                  </span>
                </div>
              </div>
            </div>

            {zrData.description && (
              <div className="mt-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <span className="text-arrow-gray text-xs uppercase tracking-wide">Description</span>
                <p className="text-white mt-1">{zrData.description}</p>
              </div>
            )}
          </div>

          {zrStateHistory.length > 0 && (
            <div className="bg-arrow-dark border border-amber-600/30 rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-amber-400 mb-8 flex items-center gap-2">
                <MapPin size={24} /> State History
              </h2>
              <div className="relative pl-4 space-y-12 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-amber-400 before:to-neutral-800">
                {[...zrStateHistory].reverse().map((entry, index) => (
                  <div key={entry.id} className="relative pl-8">
                    <div className={`absolute -left-[5px] top-1.5 w-3 h-3 rounded-full shadow-[0_0_10px] ${index === 0 ? 'bg-amber-400 shadow-amber-400' : 'bg-neutral-600 shadow-transparent'}`}></div>
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-amber-600/30 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <h3 className={`text-lg font-bold ${index === 0 ? 'text-white' : 'text-gray-300'}`}>
                          {entry.newState.description || entry.newState.name.replace(/_/g, ' ')}
                        </h3>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar size={14} /> {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.location?.hubName && (
                        <div className="text-amber-400/80 text-sm flex items-center gap-2">
                          <MapPin size={14} /> {entry.location.hubName}{entry.location.hubCity ? `, ${entry.location.hubCity}` : ''}
                        </div>
                      )}
                      {entry.comment && (
                        <div className="bg-neutral-900 rounded p-3 text-sm text-gray-400 mt-3 flex gap-2 items-start border-l-2 border-amber-600/50">
                          <MessageSquare size={16} className="mt-0.5 shrink-0 text-amber-500" />
                          <p>{entry.comment}</p>
                        </div>
                      )}
                      {entry.situations && entry.situations.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.situations.map((s, i) => (
                            <span key={i} className="inline-block bg-amber-900/20 text-amber-500 text-xs px-3 py-1 rounded-full border border-amber-900/50">
                              {s.situationName || s.situationSlug || s.situationDescription}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Modals */}
      {actionModal === 'refund' && zrData && zrCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><RotateCcw size={18} className="text-red-400" /> Create Refund</h3>
              <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{zrData.trackingNumber}</div>
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
                if (!zrCreds || !zrData || actionLoading) return;
                setActionLoading(true);
                try {
                  await createParcelRefund(zrCreds, {
                    customer: { customerId: zrData.customer.customerId, name: zrData.customer.name, phone: { number1: zrData.customer.phone.number1 } },
                    deliveryAddress: { cityTerritoryId: zrData.deliveryAddress.cityTerritoryId, districtTerritoryId: zrData.deliveryAddress.districtTerritoryId, street: zrData.deliveryAddress.street },
                    hubId: zrData.deliveryAddress.hubId,
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

      {actionModal === 'exchange' && zrData && zrCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><ArrowLeftRight size={18} className="text-blue-400" /> Create Exchange</h3>
              <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{zrData.trackingNumber}</div>
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
                if (!zrCreds || !zrData || actionLoading) return;
                setActionLoading(true);
                try {
                  const products = (zrData.orderedProducts || []).length > 0
                    ? zrData.orderedProducts.map(p => ({ productId: p.productId, productName: p.productName, unitPrice: p.unitPrice, quantity: p.quantity, length: p.dimensions?.length || 10, width: p.dimensions?.width || 10, height: p.dimensions?.height || 10, stockType: p.stockType || 'none' }))
                    : [{ productName: 'Exchange', unitPrice: Number(exchangeAmount), quantity: 1, length: 10, width: 10, height: 10, stockType: 'none' }];
                  await createParcelExchange(zrCreds, {
                    customer: { customerId: zrData.customer.customerId, name: zrData.customer.name, phone: { number1: zrData.customer.phone.number1 } },
                    orderedProducts: products,
                    weight: { weight: zrData.weight?.weight || 0.5 },
                    originalParcelId: zrData.id,
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

      {actionModal === 'modify' && zrData && zrCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setActionModal(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileEdit size={18} className="text-emerald-400" /> Modification Request</h3>
              <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="text-xs text-gray-500 font-mono mb-4 bg-neutral-800 rounded-lg px-3 py-2">{zrData.trackingNumber}</div>
            <p className="text-xs text-gray-500 mb-4">Request changes after the parcel is beyond "Confirmed au Bureau". Changes are reviewed by the hub.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">New Amount (DA) — leave empty to keep current</label>
              <input type="number" value={modifyAmount} onChange={e => setModifyAmount(e.target.value)} placeholder={`Current: ${zrData.amount}`} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">New Phone — leave empty to keep current</label>
              <input type="text" value={modifyPhone} onChange={e => setModifyPhone(e.target.value)} placeholder={`Current: ${zrData.customer.phone.number1}`} className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none text-sm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
              <button onClick={async () => {
                if (!zrCreds || !zrData || actionLoading) return;
                setActionLoading(true);
                try {
                  await createParcelModificationRequest(zrCreds, {
                    parcelId: zrData.id,
                    ...(modifyAmount ? { amount: Number(modifyAmount) } : {}),
                    ...(modifyPhone ? { phone: { number1: modifyPhone } } : {}),
                  });
                  const updated = await getParcelByTracking(zrCreds, zrData.trackingNumber);
                  setZrData(updated);
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

      {/* Results */}
      {data && (
          <div className="space-y-6 animate-slide-up">
              {/* Main Info Card */}
              <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 md:p-8 shadow-[0_0_20px_rgba(30,111,74,0.1)]">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6 mb-6">
                      <div>
                          <div className="text-arrow-gray text-sm uppercase tracking-wide mb-1">Tracking Number</div>
                          <div className="text-3xl font-bold text-arrow-green tracking-wider font-mono">{data.tracking}</div>
                          {data.created_at && (
                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                  <Calendar size={12}/> Created on {new Date(data.created_at).toLocaleDateString()}
                              </div>
                          )}
                      </div>
                      <StatusBadge status={data.activity[data.activity.length - 1]?.status || data.status} />
                  </div>

                  {/* General Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-arrow-green/30 transition-colors">
                          <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Customer</div>
                          <div className="font-semibold text-white truncate" title={data.recipientName}>{data.recipientName || 'N/A'}</div>
                          {data.phone && (
                              <div className="text-sm text-arrow-green mt-1 flex items-center gap-1">
                                  <Phone size={12} /> {data.phone}
                              </div>
                          )}
                      </div>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-arrow-green/30 transition-colors">
                          <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Shipped By</div>
                          <div className="font-semibold text-white truncate" title={data.shippedBy}>{data.shippedBy || 'N/A'}</div>
                      </div>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-arrow-green/30 transition-colors">
                          <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Route</div>
                          <div className="font-semibold text-white text-sm">
                              {WILAYAS[String(data.originCity)] || data.originCity || 'N/A'} 
                              <span className="mx-2 text-arrow-green">➜</span>
                              {WILAYAS[String(data.destLocationCity)] || data.destLocationCity || 'N/A'}
                          </div>
                      </div>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 hover:border-arrow-green/30 transition-colors">
                          <div className="text-arrow-gray text-xs mb-1 uppercase tracking-wide">Product</div>
                          <div className="font-semibold text-white flex items-center gap-2 truncate" title={data.product || 'Unknown'}>
                              <Package size={16} className="text-arrow-green shrink-0"/> 
                              {data.product || 'Standard Package'}
                          </div>
                      </div>
                  </div>

                  {/* Financial Details Section */}
                  {(data.montant || data.tarif_prestation) && (
                      <div className="bg-neutral-900/50 rounded-xl p-6 border border-arrow-deepGreen/30 relative overflow-hidden">
                          {/* Background Glow */}
                          <div className="absolute -right-10 -top-10 w-40 h-40 bg-arrow-green/5 rounded-full blur-3xl pointer-events-none"></div>
                          
                          <h3 className="text-arrow-green font-bold flex items-center gap-2 mb-6 text-lg">
                              <Wallet size={20} /> Financial Details
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div className="flex flex-col">
                                  <span className="text-gray-400 text-xs uppercase mb-1 flex items-center gap-1"><Banknote size={12}/> Total Amount (COD)</span>
                                  <span className="text-2xl font-bold text-white tracking-tight">
                                      {parseFloat(data.montant || '0').toLocaleString()} <span className="text-sm font-normal text-gray-500">DA</span>
                                  </span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-gray-400 text-xs uppercase mb-1 flex items-center gap-1"><Tag size={12}/> Delivery Fee</span>
                                  <span className="text-xl font-bold text-red-400 tracking-tight">
                                      -{parseFloat(data.tarif_prestation || '0').toLocaleString()} <span className="text-sm font-normal text-red-400/70">DA</span>
                                  </span>
                              </div>
                              <div className="flex flex-col pt-4 sm:pt-0 sm:border-l sm:border-neutral-800 sm:pl-6">
                                  <span className="text-gray-400 text-xs uppercase mb-1 font-bold text-emerald-500">Net Profit</span>
                                  <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                                      {(parseFloat(data.montant || '0') - parseFloat(data.tarif_prestation || '0')).toLocaleString()} <span className="text-lg font-normal text-emerald-600">DA</span>
                                  </span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              {/* Timeline */}
              <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-8 shadow-xl">
                  <h2 className="text-xl font-bold text-arrow-green mb-8 flex items-center gap-2">
                      <MapPin size={24} /> Tracking History
                  </h2>
                  
                  {data.activity && data.activity.length > 0 ? (
                      <div className="relative pl-4 space-y-12 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-arrow-green before:to-neutral-800">
                          {[...data.activity].reverse().map((item, index) => (
                              <div key={index} className="relative pl-8">
                                  {/* Dot */}
                                  <div className={`absolute -left-[5px] top-1.5 w-3 h-3 rounded-full shadow-[0_0_10px] ${index === 0 ? 'bg-arrow-green shadow-arrow-green' : 'bg-neutral-600 shadow-transparent'}`}></div>
                                  
                                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-arrow-green/30 transition-colors">
                                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                          <h3 className={`text-lg font-bold ${index === 0 ? 'text-white' : 'text-gray-300'}`}>
                                              {STATUS_TRANSLATIONS[item.status] || item.status.replace(/_/g, ' ').toUpperCase()}
                                          </h3>
                                          <span className="text-sm text-arrow-gray flex items-center gap-1">
                                              <Calendar size={14} /> {item.date} at {item.time}
                                          </span>
                                      </div>
                                      
                                      {item.scanLocation && (
                                          <div className="text-arrow-green text-sm mb-2 flex items-center gap-2">
                                              <MapPin size={14} /> {item.scanLocation}
                                          </div>
                                      )}
                                      
                                      {(item.reason || item.details) && (
                                          <div className="bg-neutral-900 rounded p-3 text-sm text-gray-400 mt-3 flex gap-2 items-start border-l-2 border-amber-600/50">
                                              <MessageSquare size={16} className="mt-0.5 shrink-0 text-amber-500" />
                                              <div>
                                                  {item.reason && <p className="font-medium text-amber-100">{item.reason}</p>}
                                                  {item.details && <p className="mt-1">{item.details}</p>}
                                              </div>
                                          </div>
                                      )}

                                      {item.postponed_to && (
                                          <div className="mt-3 inline-block bg-amber-900/20 text-amber-500 text-sm px-3 py-1 rounded-full border border-amber-900/50">
                                              📅 Postponed to: {item.postponed_to}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-gray-500 italic">No activity history available yet.</p>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Tracking;