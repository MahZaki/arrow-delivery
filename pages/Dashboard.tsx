import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrdersFromApi, fetchArchivedFromDb, autoArchiveDisappeared, clearCache } from '../services/api';
import { Order, ZrCredentials } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import ZrDashboardContent from '../components/ZrDashboardContent';
import ZrSubAccountContent from '../components/ZrSubAccountContent';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboardView from '../components/AdminDashboardView';
import { 
    Package, Truck, CheckCircle, RefreshCw, Search, 
    MapPin, PauseCircle, CloudUpload, Archive,
    RotateCcw, Plus, ChevronDown, Home, Filter, Calendar, FilePlus, Layers, List
} from 'lucide-react';
import { WILAYAS } from '../constants';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateApiToken, updateZrCredentials, resolveZrCredentials } = useAuth();
  
  // State for Client Dashboard
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  // Token Entry State
  const [newToken, setNewToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);

  // ZR Credentials Entry State
  const [newZrTenant, setNewZrTenant] = useState('');
  const [newZrApiKey, setNewZrApiKey] = useState('');
  const [isSavingZr, setIsSavingZr] = useState(false);

  // Resolved ZR credentials (own or inherited from master)
  const [zrCreds, setZrCreds] = useState<ZrCredentials | null>(() => {
    if (user?.zr_tenant_id && user?.zr_api_key) {
      return { tenantId: user.zr_tenant_id, apiKey: user.zr_api_key };
    }
    return null;
  });
  const [resolvingMasterCreds, setResolvingMasterCreds] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('prete_a_expedier'); // Default active tab
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // UI State
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    // Click outside handler for Add Menu
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
        setLoading(false);
        return;
    }

    if (user?.id && user?.api_token) {
        initDashboard(user.id, user.api_token);
    } else {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.zr_tenant_id && user?.zr_api_key) {
      setZrCreds({ tenantId: user.zr_tenant_id, apiKey: user.zr_api_key });
      return;
    }
    if (user?.master_id) {
      setResolvingMasterCreds(true);
      resolveZrCredentials().then(creds => {
        setZrCreds(creds);
        setResolvingMasterCreds(false);
      });
    }
  }, [resolveZrCredentials]);

  // Load: live active orders from API + archived from Supabase, merged
  const initDashboard = async (userId: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both sources in parallel
      const [liveOrders, archivedOrders] = await Promise.all([
        fetchOrdersFromApi(token),
        fetchArchivedFromDb(userId),
      ]);

      // Merge: live orders take priority (fresher), archived fill in the rest
      const liveSet = new Set(liveOrders.map(o => o.tracking));
      const uniqueArchived = archivedOrders.filter(o => !liveSet.has(o.tracking));
      setOrders([...liveOrders, ...uniqueArchived]);
      setLastSync(new Date().toISOString());

      // Background: detect disappeared orders → auto-archive (non-blocking)
      autoArchiveDisappeared(liveOrders, token, userId).catch(console.warn);

    } catch (err: any) {
      console.error(err);
      setError(`Failed to load orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh: clear cache, re-fetch both sources
  const handleForceUpdate = async () => {
    if (!user?.api_token || !user?.id) return;
    setSyncing(true);
    setError(null);
    try {
      clearCache();
      const [liveOrders, archivedOrders] = await Promise.all([
        fetchOrdersFromApi(user.api_token),
        fetchArchivedFromDb(user.id),
      ]);
      const liveSet = new Set(liveOrders.map(o => o.tracking));
      const uniqueArchived = archivedOrders.filter(o => !liveSet.has(o.tracking));
      setOrders([...liveOrders, ...uniqueArchived]);
      setLastSync(new Date().toISOString());
      // Background auto-archive
      autoArchiveDisappeared(liveOrders, user.api_token, user.id).catch(console.warn);
    } catch (err: any) {
      setError(`Refresh failed: ${err.message || 'Connection error.'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveToken = async () => {
      if(!newToken) return;
      setIsSavingToken(true);
      const success = await updateApiToken(newToken);
      setIsSavingToken(false);
      if(!success) {
          setError("Failed to save token.");
      } else {
          if (user?.id) initDashboard(user.id, newToken);
      }
  };

  const handleSaveZrCredentials = async () => {
      if(!newZrTenant || !newZrApiKey) return;
      setIsSavingZr(true);
      setError(null);
      const success = await updateZrCredentials(newZrTenant, newZrApiKey);
      setIsSavingZr(false);
      if(!success) {
          setError("Failed to save ZR credentials.");
      }
  };

  // --- Category mapping using EXACT Ecotrack API status strings ---
  // Source: /api/v1/get/orders status field values
  const CATEGORY_MAP: Record<string, string> = {
    // Prêt à expédier
    'prete_a_expedier':        'prete_a_expedier',
    // En ramassage
    'en_ramassage':            'en_ramassage',
    // En préparation stock
    'en_preparation_stock':    'en_preparation',
    // Vers hub
    'vers_hub':                'vers_station',
    // En hub (station)
    'en_hub':                  'en_station',
    // Vers wilaya
    'vers_wilaya':             'vers_wilaya',
    // En préparation (at local station)
    'en_preparation':          'en_station',
    // En livraison
    'en_livraison':            'en_livraison',
    // Suspendu
    'suspendu':                'suspendus',
    // Livré non encaissé
    'livre_non_encaisse':      'livres',
    // Encaissé non payé
    'encaisse_non_paye':       'livres',
    // Paiements prêts
    'paiements_prets':         'livres',
    // Payé et archivé
    'paye_et_archive':         'livres',
    // Retours
    'retour_chez_livreur':     'retours',
    'retour_transit_entrepot': 'retours',
    'retour_en_traitement':    'retours',
    'retour_recu':             'retours',
    'retour_archive':          'retours',
    // Annulé
    'annule':                  'retours',
  };

  const getCategory = (status: string): string => {
    if (!status) return 'prete_a_expedier';
    // Normalize: strip accents, lowercase, trim
    const normalized = status
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return CATEGORY_MAP[normalized] ?? 'prete_a_expedier';
  };

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
        // Category Filter
        const category = getCategory(order.status);
        if (category !== activeCategory) return false;

        // Search Filter
        const matchesSearch = 
            order.tracking.toLowerCase().includes(search.toLowerCase()) ||
            order.client.toLowerCase().includes(search.toLowerCase()) ||
            (order.phone && order.phone.includes(search));
        
        // Date Filter
        let matchesDate = true;
        if (dateFrom || dateTo) {
            const orderDate = new Date(order.created_at).getTime();
            if (dateFrom && orderDate < new Date(dateFrom).getTime()) matchesDate = false;
            if (dateTo && orderDate > new Date(dateTo).setHours(23, 59, 59, 999)) matchesDate = false;
        }

        return matchesSearch && matchesDate;
    });
  }, [orders, search, activeCategory, dateFrom, dateTo]);

  // Counts for the Top Bar
  const counts = useMemo(() => {
      const c: Record<string, number> = {};
      orders.forEach(o => {
          const cat = getCategory(o.status);
          c[cat] = (c[cat] || 0) + 1;
      });
      return c;
  }, [orders]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  // --- Render ---

  // ZR mode → show ZR dashboard (master sees all, sub-accounts see own)
  if ((user?.carrier || 'ecotrack') === 'zrexpress') {
    if (resolvingMasterCreds) {
      return <LoadingSpinner />;
    }
    if (!zrCreds) {
      if (user?.master_id) {
        return (
          <div className="max-w-md mx-auto mt-20 p-8 bg-arrow-dark border border-amber-600/30 rounded-2xl shadow-xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">ZR Express</h2>
            <p className="text-gray-400">Your master account hasn't configured ZR Express yet. Contact your admin.</p>
          </div>
        );
      }
      return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-arrow-dark border border-amber-600/30 rounded-2xl shadow-xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">ZR Express Setup</h2>
          <p className="text-gray-400 mb-2">Enter your ZR Express credentials to manage parcels.</p>
          <p className="text-xs text-gray-600 mb-6">
            You need a Tenant ID and API Key from the ZR Express portal.
          </p>
          <input
            type="text"
            value={newZrTenant}
            onChange={(e) => setNewZrTenant(e.target.value)}
            placeholder="ZR Tenant ID"
            className="w-full bg-black border border-neutral-700 p-3 rounded-xl text-white mb-3 focus:border-amber-500 focus:outline-none"
          />
          <input
            type="text"
            value={newZrApiKey}
            onChange={(e) => setNewZrApiKey(e.target.value)}
            placeholder="ZR API Key"
            className="w-full bg-black border border-neutral-700 p-3 rounded-xl text-white mb-4 focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={handleSaveZrCredentials}
            disabled={isSavingZr || !newZrTenant || !newZrApiKey}
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {isSavingZr ? 'Saving...' : 'Connect ZR Express'}
          </button>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>
      );
    }
    if (user?.master_id) {
      return <ZrSubAccountContent profileId={user.id} zrCredentials={zrCreds} />;
    }
    return <ZrDashboardContent credentials={zrCreds} />;
  }

  // Ecotrack mode: admin sees admin panel
  if (user?.role === 'admin') {
      return <AdminDashboardView />;
  }

  if (loading && (user?.carrier || 'ecotrack') !== 'zrexpress') {
      return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner text="Loading Dashboard..." /></div>;
  }

  // Token Prompt (Ecotrack mode)
  if (!user?.api_token) {
      return (
          <div className="max-w-md mx-auto mt-20 p-8 bg-arrow-dark border border-arrow-deepGreen rounded-2xl shadow-xl text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Connect Account</h2>
              <p className="text-gray-400 mb-6">Enter your API Token from the settings page to sync your orders.</p>
              <input 
                  type="text" 
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Paste API Token here"
                  className="w-full bg-black border border-neutral-700 p-3 rounded-xl text-white mb-4 focus:border-arrow-green focus:outline-none"
              />
              <button 
                  onClick={handleSaveToken} 
                  disabled={isSavingToken}
                  className="w-full bg-arrow-green text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                  {isSavingToken ? 'Saving...' : 'Connect'}
              </button>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
      );
  }

  // Define Tabs Configuration (Order matters!)
  const tabs = [
      { id: 'prete_a_expedier', label: 'Prêt à expédier', icon: CheckCircle, color: 'text-blue-400' },
      { id: 'en_ramassage', label: 'En ramassage', icon: Truck, color: 'text-sky-400' },
      { id: 'vers_station', label: 'Vers Station', icon: RefreshCw, color: 'text-indigo-400' },
      { id: 'en_station', label: 'En Station', icon: Home, color: 'text-teal-400' },
      { id: 'vers_wilaya', label: 'Vers Wilaya', icon: RefreshCw, color: 'text-cyan-400' },
      { id: 'en_preparation', label: 'En preparation', icon: Package, color: 'text-teal-500' },
      { id: 'en_livraison', label: 'En livraison', icon: Truck, color: 'text-blue-500' },
      { id: 'suspendus', label: 'Suspendus', icon: PauseCircle, color: 'text-yellow-400' },
      { id: 'livres', label: 'Livrés', icon: CheckCircle, color: 'text-green-500' },
      { id: 'retours', label: 'Retours', icon: RotateCcw, color: 'text-red-500' },
  ];

  return (
    <div className="min-h-screen bg-arrow-black pb-20">
      {/* Top Header */}
      <div className="bg-arrow-dark/50 border-b border-arrow-deepGreen/30 sticky top-[80px] z-30 backdrop-blur-md">
          <div className="max-w-full mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Layers size={24} className="text-arrow-green" /> My Dashboard
                  </h1>
              </div>
              <div className="flex items-center gap-4">
                  {lastSync && <span className="text-xs text-gray-500 hidden md:block">Last synced: {new Date(lastSync).toLocaleString()}</span>}
                  <button
                      onClick={() => navigate('/archive')}
                      className="bg-neutral-900 hover:bg-neutral-800 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                      title="Manage archived orders"
                  >
                      <Archive size={16} />
                      Archive
                  </button>
                  <button 
                      onClick={handleForceUpdate} 
                      disabled={syncing}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white border border-arrow-deepGreen px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                      <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                      {syncing ? 'Syncing...' : 'Sync from Network'}
                  </button>
              </div>
          </div>
      </div>

      {/* Horizontal Status Bar */}
      <div className="w-full bg-neutral-900 border-b border-arrow-deepGreen/30 sticky top-[145px] z-20 shadow-md">
          <div className="max-w-full px-2 md:px-4 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
              
              {/* Add Button Dropdown */}
              <div className="relative" ref={addMenuRef}>
                  <button 
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="flex items-center gap-2 bg-neutral-800 text-gray-300 hover:text-white px-4 py-2 rounded-lg font-semibold transition-colors mr-2 border border-neutral-700 hover:border-gray-500"
                  >
                      <CloudUpload size={18} /> Ajouter <ChevronDown size={14} />
                  </button>
                  
                  {showAddMenu && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-neutral-900 border border-arrow-deepGreen rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                          <button className="w-full text-left px-4 py-3 hover:bg-arrow-deepGreen/20 text-white flex items-center gap-2">
                              <Plus size={16} className="text-arrow-green"/> Single Order
                          </button>
                          <button className="w-full text-left px-4 py-3 hover:bg-arrow-deepGreen/20 text-white flex items-center gap-2">
                              <List size={16} className="text-blue-400"/> Bulk Import
                          </button>
                      </div>
                  )}
              </div>

              {/* Status Tabs */}
              {tabs.map((tab) => {
                  const count = counts[tab.id] || 0;
                  const isActive = activeCategory === tab.id;
                  const Icon = tab.icon;

                  return (
                      <button
                          key={tab.id}
                          onClick={() => { setActiveCategory(tab.id); setCurrentPage(1); }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                              isActive 
                              ? 'bg-neutral-800 border-arrow-green text-white shadow-[0_0_10px_rgba(47,191,142,0.15)]' 
                              : 'bg-transparent border-transparent text-gray-400 hover:bg-neutral-800/50 hover:text-gray-200'
                          }`}
                      >
                          <Icon size={16} className={isActive ? tab.color : 'text-gray-500'} />
                          {tab.label}
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs font-bold ${
                              isActive ? 'bg-white text-black' : 'bg-neutral-800 text-gray-500'
                          }`}>
                              {count}
                          </span>
                      </button>
                  );
              })}
          </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
          
          {/* Controls & Search */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input 
                      type="text" 
                      placeholder="Search tracking, client, phone..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-arrow-green focus:outline-none"
                  />
              </div>
              
              <div className="flex gap-2">
                  <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-500" size={16} />
                      <input 
                          type="date" 
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="bg-neutral-900 border border-neutral-700 text-white pl-10 pr-3 py-2.5 rounded-xl focus:border-arrow-green focus:outline-none text-sm"
                      />
                  </div>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-500" size={16} />
                      <input 
                          type="date" 
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="bg-neutral-900 border border-neutral-700 text-white pl-10 pr-3 py-2.5 rounded-xl focus:border-arrow-green focus:outline-none text-sm"
                      />
                  </div>
              </div>
          </div>

          {/* Orders Table */}
          <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                              <th className="p-4 font-semibold">Tracking</th>
                              <th className="p-4 font-semibold">Client Info</th>
                              <th className="p-4 font-semibold">Wilaya</th>
                              <th className="p-4 font-semibold">Status</th>
                              <th className="p-4 font-semibold">Product</th>
                              <th className="p-4 font-semibold text-right">Amount</th>
                              <th className="p-4 font-semibold text-right">Date</th>
                              <th className="p-4 font-semibold text-center">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800 text-sm">
                          {currentOrders.length > 0 ? (
                              currentOrders.map((order) => (
                                  <tr key={order.tracking} className="hover:bg-neutral-900/50 transition-colors group">
                                      <td className="p-4">
                                          <div className="font-bold text-white font-mono">{order.tracking}</div>
                                      </td>
                                      <td className="p-4">
                                          <div className="text-white font-medium">{order.client}</div>
                                          {order.phone && <div className="text-gray-500 text-xs mt-0.5">{order.phone}</div>}
                                      </td>
                                      <td className="p-4 text-gray-300">
                                          {WILAYAS[String(order.wilaya_id)] || order.wilaya_id}
                                      </td>
                                      <td className="p-4">
                                          <StatusBadge status={order.status} />
                                      </td>
                                      <td className="p-4 text-gray-400 max-w-[200px] truncate" title={order.product || order.products}>
                                          {order.product || order.products || '-'}
                                      </td>
                                      <td className="p-4 text-right font-mono font-medium text-emerald-400">
                                          {order.montant ? `${Number(order.montant).toLocaleString()} DA` : '-'}
                                      </td>
                                      <td className="p-4 text-right text-gray-500">
                                          {new Date(order.created_at).toLocaleDateString()}
                                      </td>
                                      <td className="p-4 text-center">
                                          <button 
                                              onClick={() => navigate(`/track?tracking=${order.tracking}`)}
                                              className="p-2 hover:bg-arrow-green/20 rounded-lg text-arrow-green transition-colors"
                                              title="View Details"
                                          >
                                              <Search size={18} />
                                          </button>
                                      </td>
                                  </tr>
                              ))
                          ) : (
                              <tr>
                                  <td colSpan={8} className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                                      <div className="mb-4 p-4 bg-neutral-900 rounded-full">
                                          <Filter size={32} className="opacity-50" />
                                      </div>
                                      <p>No orders found in this category.</p>
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
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white disabled:opacity-30"
                      >
                          Prev
                      </button>
                      <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
                      <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

export default Dashboard;