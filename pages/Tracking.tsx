import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, MapPin, Calendar, MessageSquare, AlertCircle, Package, Phone, Wallet, Banknote, Tag, Truck } from 'lucide-react';
import { trackOrder } from '../services/api';
import { getParcelByTracking } from '../services/zrExpressApi';
import { TrackingInfo, ZrParcel, ZrCredentials } from '../types';
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
  const { user } = useAuth();
  const location = useLocation();

  const zrCreds: ZrCredentials | null =
    user?.zr_tenant_id && user?.zr_api_key
      ? { tenantId: user.zr_tenant_id, apiKey: user.zr_api_key }
      : null;

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
                    {zrData.amount.toLocaleString()} <span className="text-sm font-normal text-gray-500">DA</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase mb-1">Delivery Fee</span>
                  <span className="text-xl font-bold text-red-400 tracking-tight">
                    -{zrData.deliveryPrice.toLocaleString()} <span className="text-sm font-normal text-red-400/70">DA</span>
                  </span>
                </div>
                <div className="flex flex-col pt-4 sm:pt-0 sm:border-l sm:border-neutral-800 sm:pl-6">
                  <span className="text-gray-400 text-xs uppercase mb-1 font-bold text-emerald-500">Net</span>
                  <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                    {(zrData.amount - (zrData.deliveryPrice + (zrData.ReturnPrice || 0))).toLocaleString()} <span className="text-lg font-normal text-emerald-600">DA</span>
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