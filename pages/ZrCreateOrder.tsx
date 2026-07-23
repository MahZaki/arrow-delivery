import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZrCredentials, ZrTerritory, ZrCreateParcelRequest } from '../types';
import { createParcel, getParcelById, getAllRates, getAllWilayas, getCommunesByWilaya, searchWorkflows, updateParcelState, searchHubs, generateIndividualLabels } from '../services/zrExpressApi';
import { saveParcel } from '../services/resellerApi';
import { addTransaction } from '../services/transactionApi';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, Plus, Trash2, Package, MapPin, Phone, User, Tag, Truck, Home, Save } from 'lucide-react';

const ZrCreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const { user, resolveZrCredentials } = useAuth();

  const [wilayas, setWilayas] = useState<ZrTerritory[]>([]);
  const [communes, setCommunes] = useState<ZrTerritory[]>([]);
  const [loadingTerritories, setLoadingTerritories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [street, setStreet] = useState('');
  const [deliveryType, setDeliveryType] = useState<'home' | 'pickup-point'>('home');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [weight, setWeight] = useState('');

  const [products, setProducts] = useState<Array<{ name: string; price: string; quantity: string }>>([
    { name: '', price: '', quantity: '1' },
  ]);

  const [credentials, setCredentials] = useState<ZrCredentials | null>(null);

  const [allRates, setAllRates] = useState<Map<string, import('../types').ZrDeliveryRate>>(new Map());
  const [loadingRates, setLoadingRates] = useState(true);
  const [deliveryRate, setDeliveryRate] = useState<number | null>(null);
  const [myDeliveryPrice, setMyDeliveryPrice] = useState<number | null>(null);

  const [hubs, setHubs] = useState<import('../types').ZrHub[]>([]);
  const [selectedHub, setSelectedHub] = useState('');
  const [lastTracking, setLastTracking] = useState<string | null>(null);
  const [lastParcelId, setLastParcelId] = useState<string | null>(null);

  const calcMyPrice = (zrPrice: number): number => {
    if (!user?.master_id || !user?.markup_type) return zrPrice;
    if (user.markup_type === 'flat') return zrPrice + (user.markup_value || 0);
    return zrPrice * (1 + (user.markup_value || 0) / 100);
  };

  useEffect(() => {
    resolveZrCredentials().then(setCredentials);
  }, [resolveZrCredentials]);

  useEffect(() => {
    if (!credentials) return;
    setLoadingTerritories(true);
    getAllWilayas(credentials)
      .then(setWilayas)
      .catch(err => setError('Failed to load wilayas: ' + err.message))
      .finally(() => setLoadingTerritories(false));
  }, [credentials?.tenantId, credentials?.apiKey]);

  useEffect(() => {
    if (!credentials || !selectedWilaya) {
      setCommunes([]);
      return;
    }
    getCommunesByWilaya(credentials, selectedWilaya)
      .then(setCommunes)
      .catch(() => setCommunes([]));
  }, [selectedWilaya, credentials?.tenantId, credentials?.apiKey]);

  useEffect(() => {
    if (!credentials) return;
    setLoadingRates(true);
    getAllRates(credentials)
      .then(rates => {
        const map = new Map<string, import('../types').ZrDeliveryRate>();
        for (const r of rates) {
          map.set(r.toTerritoryId, r);
        }
        setAllRates(map);
      })
      .catch(() => setAllRates(new Map()))
      .finally(() => setLoadingRates(false));
  }, [credentials?.tenantId, credentials?.apiKey]);

  useEffect(() => {
    if (!credentials) return;
    searchHubs(credentials, { pageNumber: 1, pageSize: 200 })
      .then(res => setHubs(res.items.filter(h => h.isPickupPoint)))
      .catch(() => setHubs([]));
  }, [credentials?.tenantId, credentials?.apiKey]);

  const extractPrice = (rate: import('../types').ZrDeliveryRate | undefined): number | null => {
    if (!rate) return null;
    return rate.deliveryPrices?.find(p => p.deliveryType === deliveryType)?.price
      ?? rate.deliveryPrices?.find(p => p.deliveryType === 'home')?.price
      ?? null;
  };

  useEffect(() => {
    if (!selectedCommune || !selectedWilaya) {
      setDeliveryRate(null);
      setMyDeliveryPrice(null);
      return;
    }
    const rate = allRates.get(selectedCommune) ?? allRates.get(selectedWilaya) ?? null;
    const price = extractPrice(rate);
    setDeliveryRate(price);
    setMyDeliveryPrice(price != null ? calcMyPrice(price) : null);
  }, [selectedCommune, selectedWilaya, deliveryType, allRates]);

  const addProduct = () => {
    setProducts([...products, { name: '', price: '', quantity: '1' }]);
  };

  const removeProduct = (index: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: string) => {
    const updated = [...products];
    (updated[index] as any)[field] = value;
    setProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials) {
      setError('ZR Express credentials not configured. Set them in the Admin panel.');
      return;
    }

    if (!customerName || !customerPhone || !selectedWilaya || !selectedCommune || !amount || !description) {
      setError('Please fill in all required fields.');
      return;
    }
    if (deliveryType === 'pickup-point' && !selectedHub) {
      setError('Please select a pickup point hub.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: ZrCreateParcelRequest = {
        customer: {
          customerId: crypto.randomUUID(),
          name: customerName,
          phone: {
            number1: customerPhone,
            ...(customerPhone2 ? { number2: customerPhone2 } : {}),
          },
        },
        deliveryAddress: {
          cityTerritoryId: selectedWilaya,
          districtTerritoryId: selectedCommune,
          ...(street ? { street } : {}),
        },
        orderedProducts: products
          .filter(p => p.name)
          .map(p => ({
            productName: p.name,
            unitPrice: parseFloat(p.price) || 0,
            quantity: parseInt(p.quantity) || 1,
            stockType: 'none',
          })),
        deliveryType,
        description,
        amount: parseFloat(amount) || 0,
        ...(weight ? { weight: { weight: parseFloat(weight) } } : {}),
        ...(deliveryType === 'pickup-point' && selectedHub ? { hubId: selectedHub } : {}),
      };

      const result = await createParcel(credentials, payload);
      const parcelDetails = await getParcelById(credentials, result.id);
      if (user) {
        const savedParcelId = await saveParcel(
          user.id,
          result.id,
          parcelDetails.trackingNumber,
          parseFloat(amount) || 0,
          deliveryRate || 0, myDeliveryPrice || 0,
          parcelDetails.state.name
        );
        if (user.master_id && myDeliveryPrice) {
          await addTransaction(user.id, 'delivery_fee', -myDeliveryPrice, savedParcelId, parcelDetails.trackingNumber);
        }
      }
      searchWorkflows(credentials, { pageNumber: 1, pageSize: 50 })
        .then(workflows => {
          const readyDispatch = workflows.items
            .flatMap(w => w.states)
            .find(s => s.name === 'ReadyToDispatch' || s.name === 'Prêt à expédier' || s.name === 'Pret a expedier');
          if (readyDispatch) {
            updateParcelState(credentials, result.id, { stateId: readyDispatch.id }).catch(() => {});
          }
        })
        .catch(() => {});
      setLastTracking(parcelDetails.trackingNumber);
      setLastParcelId(result.id);
      setSuccess(`Parcel created successfully! Tracking: ${parcelDetails.trackingNumber}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create parcel');
    } finally {
      setSubmitting(false);
    }
  };

  if (!credentials) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-arrow-dark border border-amber-600/30 rounded-2xl shadow-xl text-center">
        <h2 className="text-2xl font-bold text-white mb-4">ZR Express Credentials Required</h2>
        <p className="text-gray-400 mb-6">Please configure your ZR Express Tenant ID and API Key in the Admin panel before creating orders.</p>
        <button onClick={() => navigate('/dashboard')} className="text-amber-400 hover:underline">Back to Dashboard</button>
      </div>
    );
  }

  const totalAmount = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0) * (parseInt(p.quantity) || 1), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-6 transition-colors">
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="bg-arrow-dark border border-amber-600/30 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-8">
          <Package className="text-amber-400" size={28} /> Create ZR Express Parcel
        </h1>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-900/20 border border-emerald-500/50 text-emerald-200 p-4 rounded-xl mb-6">
            {success}
            <div className="flex gap-3 mt-3">
              <button onClick={() => navigate('/dashboard')}
                className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors">
                Go to Dashboard
              </button>
              <button onClick={async () => {
                if (!credentials || !lastTracking) return;
                try {
                  const result = await generateIndividualLabels(credentials, { trackingNumbers: [lastTracking] });
                  if (result.parcelLabelFiles.length > 0) {
                    window.open(result.parcelLabelFiles[0].fileUrl, '_blank');
                  }
                } catch {}
              }} className="text-sm bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded-lg font-medium transition-colors">
                Print Label
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Section */}
          <section>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
              <User size={20} /> Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Full Name *</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  placeholder="Mohamed Amine" required />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block flex items-center gap-1"><Phone size={12} /> Phone *</label>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  placeholder="+213550050505" required />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Phone 2 (optional)</label>
                <input type="tel" value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  placeholder="+213666060606" />
              </div>
            </div>
          </section>

          {/* Delivery Section */}
          <section>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
              <MapPin size={20} /> Delivery Address
            </h2>
            {loadingTerritories ? (
              <LoadingSpinner text="Loading territories..." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Wilaya *</label>
                  <select value={selectedWilaya} onChange={e => { setSelectedWilaya(e.target.value); setSelectedCommune(''); }}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none">
                    <option value="">Select Wilaya</option>
                    {wilayas.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Commune *</label>
                  <select value={selectedCommune} onChange={e => setSelectedCommune(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                    disabled={!selectedWilaya}>
                    <option value="">Select Commune</option>
                    {communes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Street (optional)</label>
                  <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                    placeholder="cité 221 lots, num 98" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block flex items-center gap-1"><Truck size={12} /> Delivery Type *</label>
                  <select value={deliveryType} onChange={e => { setDeliveryType(e.target.value as 'home' | 'pickup-point'); setSelectedHub(''); }}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none">
                    <option value="home">Home Delivery</option>
                    <option value="pickup-point">Pickup Point</option>
                  </select>
                </div>
                {deliveryType === 'pickup-point' && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Pickup Point *</label>
                    <select value={selectedHub} onChange={e => setSelectedHub(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none">
                      <option value="">Select Hub</option>
                      {hubs.map(h => (
                        <option key={h.id} value={h.id}>{h.name} — {h.address?.city ?? h.address?.district ?? ''}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Products Section */}
          <section>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
              <Tag size={20} /> Products
            </h2>
            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={index} className="flex gap-3 items-end bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Name</label>
                    <input type="text" value={product.name} onChange={e => updateProduct(index, 'name', e.target.value)}
                      className="w-full bg-black border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="Product name" />
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-500 mb-1 block">Price</label>
                    <input type="number" value={product.price} onChange={e => updateProduct(index, 'price', e.target.value)}
                      className="w-full bg-black border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="0" min="0" step="0.01" />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                    <input type="number" value={product.quantity} onChange={e => updateProduct(index, 'quantity', e.target.value)}
                      className="w-full bg-black border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-amber-500 focus:outline-none"
                      min="1" />
                  </div>
                  <button type="button" onClick={() => removeProduct(index)}
                    className="p-2 text-red-400 hover:text-red-300 disabled:opacity-30"
                    disabled={products.length <= 1}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addProduct}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors">
                <Plus size={16} /> Add Product
              </button>
            </div>
          </section>

          {/* Details Section */}
          <section>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
              <Home size={20} /> Parcel Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Description *</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  placeholder="e.g., Chocolat au lait Lindt" required />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Total Amount (DA) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  placeholder="5000" min="0" max="150000" required />
                <div className="text-xs text-gray-600 mt-1">Calculated total from products: {totalAmount.toLocaleString()} DA</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Weight (kg, optional)</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  placeholder="1.5" min="0" step="0.1" />
              </div>
            </div>
          </section>

          {/* Delivery Pricing */}
          {loadingRates ? (
            <LoadingSpinner text="Loading rates..." />
          ) : selectedCommune && deliveryRate != null ? (
            <section className="bg-amber-900/10 border border-amber-600/30 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-amber-400 mb-2">Delivery Pricing</h3>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-400">Base: <strong className="text-white">{deliveryRate.toLocaleString()} DA</strong></span>
                {myDeliveryPrice != null && myDeliveryPrice !== deliveryRate && (
                  <span className="text-gray-400">Your price: <strong className="text-amber-300">{myDeliveryPrice.toLocaleString()} DA</strong></span>
                )}
              </div>
            </section>
          ) : selectedCommune ? (
            <section className="bg-neutral-900/50 border border-neutral-700 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-gray-500 mb-2">Delivery Pricing</h3>
              <p className="text-sm text-gray-500">ZR Express has no delivery rate configured for this territory yet.</p>
            </section>
          ) : null}

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t border-neutral-800">
            <button type="button" onClick={() => navigate('/dashboard')}
              className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50">
              {submitting ? <LoadingSpinner /> : <Save size={20} />}
              {submitting ? 'Creating...' : 'Create Parcel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZrCreateOrder;
