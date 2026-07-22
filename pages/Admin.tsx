import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { WILAYAS } from '../constants';
import { PricingItem, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { 
    Trash2, MapPin, DollarSign, Building, Loader2, Lock, Users, Save, Database, 
    AlertCircle, CheckCircle, XCircle, X
} from 'lucide-react';

const Admin: React.FC = () => {
  const { 
    pricing, desks, users,
    addPricing, updatePricing, deletePricing, 
    addStation, updateStation, deleteStation,
    refreshUsers, updateUserToken,
    loadingData,
    seedPricing, seedStations
  } = useData();
  
  const {
    user, isMaster,
    createSubAccount, updateSubAccountMarkup,
  } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'pricing' | 'desks' | 'users' | 'subs'>('users');
  const [processingId, setProcessingId] = useState<number | string | null>(null);

  // Sub-account state
  const [subEmail, setSubEmail] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subMarkupType, setSubMarkupType] = useState<'flat' | 'percentage'>('flat');
  const [subMarkupValue, setSubMarkupValue] = useState(0);
  const [creatingSub, setCreatingSub] = useState(false);
  const [subAccounts, setSubAccounts] = useState<UserProfile[]>([]);

  // Custom UI State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
      if (user?.role === 'admin') {
          refreshUsers();
      }
  }, [user]);

  useEffect(() => {
    if (!isMaster) return;
    supabase.from('profiles').select('*').eq('master_id', user!.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSubAccounts(data as UserProfile[]); });
  }, [isMaster, user]);

  // Toast Timer
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const showToast = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
  };

  const confirmAction = (title: string, message: string, action: () => void) => {
      setModalConfig({ title, message, action });
      setModalOpen(true);
  };

  const executeModalAction = () => {
      if (modalConfig) {
          modalConfig.action();
          setModalOpen(false);
      }
  };

  // Security Check
  if (user?.role !== 'admin') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
              <Lock size={64} className="text-red-500 mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
              <p className="text-gray-400 mb-6">You do not have permission to view this page.</p>
              <button onClick={() => navigate('/dashboard')} className="text-arrow-green hover:underline">
                  Return to Dashboard
              </button>
          </div>
      );
  }

  // Check if data is static
  const isPricingStatic = pricing.length > 0 && !pricing[0].id;
  const isDeskStatic = desks.length > 0 && desks[0].stations.length > 0 && !desks[0].stations[0].id;

  // --- Pricing Logic ---
  const [newCity, setNewCity] = useState('');
  const [newDomicile, setNewDomicile] = useState(0);
  const [newStop, setNewStop] = useState(0);

  const handleAddCity = async () => {
    if (!newCity) return;
    setProcessingId('add-city');
    const result = await addPricing({ city: newCity, domicile: newDomicile, stop: newStop });
    setProcessingId(null);
    
    if (result.success) {
        setNewCity('');
        setNewDomicile(0);
        setNewStop(0);
        showToast('success', 'City added successfully');
    } else {
        showToast('error', result.message || 'Failed to add city');
    }
  };

  const handleUpdatePricing = async (id: number, field: keyof PricingItem, value: any) => {
    await updatePricing(id, { [field]: value });
  };

  const handleDeletePricing = (id: number) => {
    confirmAction(
        "Delete City", 
        "Are you sure you want to delete this city? This cannot be undone.",
        async () => {
            setProcessingId(`delete-p-${id}`);
            const result = await deletePricing(id);
            setProcessingId(null);
            if(result.success) showToast('success', 'City deleted');
            else showToast('error', result.message || 'Error deleting');
        }
    );
  };

  const handleSeedPricing = () => {
      confirmAction(
        "Import Defaults",
        "This will import all default cities into the database. This is required to start editing. Continue?",
        async () => {
            setProcessingId('seeding');
            const result = await seedPricing();
            setProcessingId(null);
            
            if (result.success) showToast('success', 'Default pricing imported!');
            else showToast('error', result.message || 'Import failed.');
        }
      );
  };

  const handleSeedStations = () => {
      confirmAction(
        "Import Stations",
        "This will import all default stations into the database. Continue?",
        async () => {
            setProcessingId('seeding-stations');
            const result = await seedStations();
            setProcessingId(null);
            
            if (result.success) showToast('success', 'Stations imported successfully!');
            else showToast('error', result.message || 'Import failed.');
        }
      );
  };

  // --- Desk Logic ---
  const [selectedWilaya, setSelectedWilaya] = useState<string>('Alger');
  const [newStationName, setNewStationName] = useState('');
  const [newStationAddress, setNewStationAddress] = useState('');
  const [newStationPhone, setNewStationPhone] = useState('');
  const [newStationMap, setNewStationMap] = useState('');

  // Find stations for selected wilaya from the grouped data
  const currentStations = desks.find(d => d.wilaya === selectedWilaya)?.stations || [];

  const handleAddStation = async () => {
    if(!newStationName) return;
    setProcessingId('add-station');
    const result = await addStation({
        wilaya: selectedWilaya,
        name: newStationName,
        address: newStationAddress,
        phone: newStationPhone,
        mapsUrl: newStationMap
    });
    setProcessingId(null);

    if (result.success) {
        setNewStationName('');
        setNewStationAddress('');
        setNewStationPhone('');
        setNewStationMap('');
        showToast('success', 'Station added');
    } else {
        showToast('error', result.message || 'Error adding station');
    }
  };

  const handleUpdateStation = async (id: number, field: string, value: string) => {
      await updateStation(id, { [field]: value } as any);
  };

  const handleDeleteStation = (id: number) => {
      confirmAction(
          "Delete Station",
          "Remove this station permanently?",
          async () => {
              setProcessingId(`delete-s-${id}`);
              const result = await deleteStation(id);
              setProcessingId(null);
              if(result.success) showToast('success', 'Station deleted');
              else showToast('error', result.message || 'Error deleting');
          }
      );
  };

  // --- User Logic ---
  const handleUpdateUserToken = async (userId: string, newToken: string) => {
      setProcessingId(`user-token-${userId}`);
      const result = await updateUserToken(userId, newToken);
      setProcessingId(null);
      if(result.success) showToast('success', 'Token updated');
      else showToast('error', 'Failed to update token');
  };

  const handleUpdateZrCredentials = async (userId: string, tenantId: string, apiKey: string) => {
      setProcessingId(`zr-${userId}`);
      const { error } = await supabase
        .from('profiles')
        .update({ zr_tenant_id: tenantId || null, zr_api_key: apiKey || null })
        .eq('id', userId);
      setProcessingId(null);
      if (!error) { showToast('success', 'ZR credentials updated'); refreshUsers(); }
      else showToast('error', 'Failed to update ZR credentials');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      {/* Toast Notification */}
      {notification && (
          <div className={`fixed top-24 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-slide-up ${
              notification.type === 'success' 
              ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' 
              : 'bg-red-900/90 border-red-500 text-red-100'
          }`}>
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
      )}

      {/* Confirmation Modal */}
      {modalOpen && modalConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
              <div className="bg-neutral-900 border border-arrow-deepGreen w-full max-w-md p-6 rounded-2xl shadow-2xl relative z-10 animate-fade-in">
                  <h3 className="text-xl font-bold text-white mb-2">{modalConfig.title}</h3>
                  <p className="text-gray-400 mb-6">{modalConfig.message}</p>
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setModalOpen(false)}
                          className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={executeModalAction}
                          className="px-6 py-2 bg-arrow-green text-black font-bold rounded-lg hover:bg-emerald-400 transition-colors"
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Admin CMS
            {loadingData && <Loader2 className="animate-spin text-arrow-green" />}
        </h1>
        <div className="text-xs font-mono text-gray-500 bg-black p-2 rounded border border-neutral-800">
            Secure Connection
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-arrow-deepGreen">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'text-arrow-green border-b-2 border-arrow-green' : 'text-gray-400 hover:text-white'}`}
        >
          <Users size={20} /> User Management
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${activeTab === 'pricing' ? 'text-arrow-green border-b-2 border-arrow-green' : 'text-gray-400 hover:text-white'}`}
        >
          <DollarSign size={20} /> Pricing
        </button>
        <button
          onClick={() => setActiveTab('desks')}
          className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${activeTab === 'desks' ? 'text-arrow-green border-b-2 border-arrow-green' : 'text-gray-400 hover:text-white'}`}
        >
          <Building size={20} /> Stations
        </button>
        {isMaster && (
          <button
            onClick={() => setActiveTab('subs')}
            className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${activeTab === 'subs' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}
          >
            <Users size={20} /> Sub-Accounts
          </button>
        )}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="animate-fade-in bg-arrow-dark border border-arrow-deepGreen rounded-xl overflow-hidden shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Registered Users</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-neutral-950 text-arrow-green">
                        <tr>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">API Token</th>
                            <th className="px-4 py-3">ZR Tenant ID</th>
                            <th className="px-4 py-3">ZR API Key</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-arrow-deepGreen/30">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-neutral-900">
                                <td className="p-4 text-white">{u.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="text" 
                                            defaultValue={u.api_token || ''} 
                                            placeholder="No Token"
                                            id={`token-input-${u.id}`}
                                            className="bg-black border border-neutral-700 rounded px-3 py-2 text-white w-full focus:border-arrow-green focus:outline-none font-mono text-xs"
                                        />
                                        <button 
                                            onClick={() => {
                                                const input = document.getElementById(`token-input-${u.id}`) as HTMLInputElement;
                                                handleUpdateUserToken(u.id, input.value);
                                            }}
                                            disabled={processingId === `user-token-${u.id}`}
                                            className="text-arrow-green hover:text-emerald-400 disabled:opacity-50 shrink-0"
                                        >
                                            {processingId === `user-token-${u.id}` ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                                        </button>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="text" 
                                        defaultValue={u.zr_tenant_id || ''} 
                                        placeholder="—"
                                        id={`zr-tenant-${u.id}`}
                                        className="bg-black border border-neutral-700 rounded px-3 py-2 text-white w-full focus:border-amber-500 focus:outline-none font-mono text-xs"
                                    />
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="text" 
                                        defaultValue={u.zr_api_key || ''} 
                                        placeholder="—"
                                        id={`zr-key-${u.id}`}
                                        className="bg-black border border-neutral-700 rounded px-3 py-2 text-white w-full focus:border-amber-500 focus:outline-none font-mono text-xs"
                                    />
                                </td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => {
                                            const tenantInput = document.getElementById(`zr-tenant-${u.id}`) as HTMLInputElement;
                                            const keyInput = document.getElementById(`zr-key-${u.id}`) as HTMLInputElement;
                                            handleUpdateZrCredentials(u.id, tenantInput.value, keyInput.value);
                                        }}
                                        disabled={processingId === `zr-${u.id}`}
                                        className="text-amber-400 hover:text-amber-300 disabled:opacity-50"
                                    >
                                        {processingId === `zr-${u.id}` ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-sm text-gray-500">
                To create a new user, ask them to Sign Up via the Login page. Then refresh this list to assign their token.
            </div>
        </div>
      )}

      {/* Pricing Editor */}
      {activeTab === 'pricing' && (
        <div className="animate-fade-in bg-arrow-dark border border-arrow-deepGreen rounded-xl overflow-hidden shadow-xl p-6">
            
            {/* Seeding Alert for Static Data */}
            {isPricingStatic && (
                <div className="mb-6 p-6 bg-blue-900/20 border border-blue-800 rounded-xl text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="text-blue-400" size={32} />
                        <h3 className="text-xl font-bold text-blue-300">Using Default Pricing Data</h3>
                        <p className="text-gray-400 max-w-lg">
                            The database is currently empty, so the app is showing default values. 
                            To edit prices, you must first import these defaults into the database.
                        </p>
                        <button 
                            onClick={handleSeedPricing}
                            disabled={!!processingId}
                            className="mt-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            {processingId === 'seeding' ? <Loader2 className="animate-spin" /> : <Database size={18} />}
                            Import Defaults to Database
                        </button>
                    </div>
                </div>
            )}

            {/* Add New City Form */}
            <div className={`mb-6 p-4 bg-neutral-900 rounded-xl border border-neutral-800 flex flex-wrap gap-4 items-end ${isPricingStatic ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 block">City Name</label>
                    <input 
                        type="text" 
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
                        placeholder="e.g. New City"
                    />
                </div>
                <div className="w-32">
                    <label className="text-xs text-gray-500 mb-1 block">Domicile (DA)</label>
                    <input 
                        type="number" 
                        value={newDomicile}
                        onChange={(e) => setNewDomicile(Number(e.target.value))}
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
                    />
                </div>
                <div className="w-32">
                    <label className="text-xs text-gray-500 mb-1 block">Stop (DA)</label>
                    <input 
                        type="number" 
                        value={newStop}
                        onChange={(e) => setNewStop(Number(e.target.value))}
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-white"
                    />
                </div>
                <button 
                    onClick={handleAddCity}
                    disabled={!newCity || processingId === 'add-city'}
                    className="bg-arrow-green text-black px-6 py-2 rounded-lg font-bold hover:bg-emerald-400 disabled:opacity-50"
                >
                    {processingId === 'add-city' ? <Loader2 className="animate-spin" /> : 'Add'}
                </button>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left">
                    <thead className="bg-neutral-950 text-arrow-green sticky top-0">
                        <tr>
                            <th className="px-4 py-3">City</th>
                            <th className="px-4 py-3">Domicile (DA)</th>
                            <th className="px-4 py-3">Stop Desk (DA)</th>
                            <th className="px-4 py-3 w-16">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-arrow-deepGreen/30">
                        {pricing.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-neutral-900">
                                <td className="p-2">
                                    <input 
                                        type="text" 
                                        defaultValue={item.city} 
                                        readOnly={isPricingStatic}
                                        onBlur={(e) => !isPricingStatic && item.id && handleUpdatePricing(item.id, 'city', e.target.value)}
                                        className={`bg-transparent border border-transparent rounded px-2 py-1 text-white w-full focus:outline-none ${!isPricingStatic ? 'hover:border-neutral-700 focus:border-arrow-green focus:bg-neutral-950' : 'cursor-default'}`}
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        defaultValue={item.domicile} 
                                        readOnly={isPricingStatic}
                                        onBlur={(e) => !isPricingStatic && item.id && handleUpdatePricing(item.id, 'domicile', Number(e.target.value))}
                                        className={`bg-transparent border border-transparent rounded px-2 py-1 text-white w-full focus:outline-none ${!isPricingStatic ? 'hover:border-neutral-700 focus:border-arrow-green focus:bg-neutral-950' : 'cursor-default'}`}
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        defaultValue={item.stop} 
                                        readOnly={isPricingStatic}
                                        onBlur={(e) => !isPricingStatic && item.id && handleUpdatePricing(item.id, 'stop', Number(e.target.value))}
                                        className={`bg-transparent border border-transparent rounded px-2 py-1 text-white w-full focus:outline-none ${!isPricingStatic ? 'hover:border-neutral-700 focus:border-arrow-green focus:bg-neutral-950' : 'cursor-default'}`}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    {!isPricingStatic && (
                                        <button 
                                            onClick={() => item.id && handleDeletePricing(item.id)} 
                                            className="text-red-400 hover:text-red-300"
                                            disabled={!!processingId}
                                        >
                                            {processingId === `delete-p-${item.id}` ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18} />}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Sub-Accounts Tab */}
      {activeTab === 'subs' && isMaster && (
        <div className="animate-fade-in bg-arrow-dark border border-amber-600/30 rounded-xl overflow-hidden shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-amber-400" /> Manage Sub-Accounts
          </h2>

          {/* Create Sub-Account Form */}
          <div className="mb-8 p-6 bg-neutral-900/50 rounded-xl border border-amber-600/20">
            <h3 className="text-sm font-bold text-amber-400 uppercase mb-4">Create New Sub-Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input type="email" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                placeholder="Email" className="bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none" />
              <input type="password" value={subPassword} onChange={e => setSubPassword(e.target.value)}
                placeholder="Password" className="bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none" />
              <select value={subMarkupType} onChange={e => setSubMarkupType(e.target.value as 'flat' | 'percentage')}
                className="bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none">
                <option value="flat">Flat (DA)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input type="number" value={subMarkupValue} onChange={e => setSubMarkupValue(Number(e.target.value))}
                placeholder={subMarkupType === 'flat' ? 'Extra DA per parcel' : 'Extra % per parcel'}
                className="bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none" />
              <button onClick={async () => {
                if (!subEmail || !subPassword) return;
                setCreatingSub(true);
                const result = await createSubAccount(subEmail, subPassword, subMarkupType, subMarkupValue);
                setCreatingSub(false);
                if (result.success) {
                  showToast('success', 'Sub-account created!');
                  setSubEmail(''); setSubPassword(''); setSubMarkupValue(0);
                  const { data } = await supabase.from('profiles').select('*').eq('master_id', user!.id);
                  if (data) setSubAccounts(data as UserProfile[]);
                } else {
                  showToast('error', result.error || 'Failed to create');
                }
              }} disabled={creatingSub || !subEmail || !subPassword}
                className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingSub ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
                {creatingSub ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          {/* Sub-Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-950 text-amber-400">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Markup Type</th>
                  <th className="px-4 py-3">Markup Value</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-600/20">
                {subAccounts.map(sa => (
                  <tr key={sa.id} className="hover:bg-neutral-900/50">
                    <td className="p-4 text-white">{sa.email}</td>
                    <td className="p-4">
                      <select defaultValue={sa.markup_type || 'flat'} onChange={e => updateSubAccountMarkup(sa.id, e.target.value as 'flat' | 'percentage', sa.markup_value || 0)}
                        className="bg-black border border-neutral-700 rounded px-3 py-1.5 text-white text-sm focus:border-amber-500 focus:outline-none">
                        <option value="flat">Flat</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <input type="number" defaultValue={sa.markup_value || 0} onBlur={e => updateSubAccountMarkup(sa.id, sa.markup_type as 'flat' | 'percentage' || 'flat', Number(e.target.value))}
                        className="bg-black border border-neutral-700 rounded px-3 py-1.5 text-white w-24 text-sm focus:border-amber-500 focus:outline-none" />
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-gray-500">{sa.markup_type === 'flat' ? 'DA' : '%'}</span>
                    </td>
                  </tr>
                ))}
                {subAccounts.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No sub-accounts yet. Create one above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Desk Editor */}
      {activeTab === 'desks' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Wilaya Selector Sidebar */}
            <div className="md:col-span-1 bg-arrow-dark border border-arrow-deepGreen rounded-xl p-4 h-fit max-h-[80vh] overflow-y-auto">
                <h3 className="font-bold text-arrow-green mb-4 sticky top-0 bg-arrow-dark pb-2 border-b border-gray-700">Select Wilaya</h3>
                <div className="space-y-1">
                    {Object.values(WILAYAS).sort().map(wilaya => (
                        <button
                            key={wilaya}
                            onClick={() => setSelectedWilaya(wilaya)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                selectedWilaya === wilaya 
                                ? 'bg-arrow-green text-black font-bold' 
                                : 'text-gray-400 hover:bg-neutral-800 hover:text-white'
                            }`}
                        >
                            {wilaya}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stations Editor */}
            <div className="md:col-span-3">
                <div className="bg-arrow-dark border border-arrow-deepGreen rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                           <MapPin /> {selectedWilaya} Stations
                        </h2>
                    </div>

                    {/* Seeding Alert for Stations */}
                    {isDeskStatic && (
                        <div className="mb-6 p-6 bg-blue-900/20 border border-blue-800 rounded-xl text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <AlertCircle className="text-blue-400" size={32} />
                                <h3 className="text-xl font-bold text-blue-300">Using Default Station Data</h3>
                                <p className="text-gray-400 max-w-lg">
                                    Station data is currently being served from defaults. 
                                    Import them to the database to start managing locations.
                                </p>
                                <button 
                                    onClick={handleSeedStations}
                                    disabled={!!processingId}
                                    className="mt-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    {processingId === 'seeding-stations' ? <Loader2 className="animate-spin" /> : <Database size={18} />}
                                    Import Stations to Database
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Add Station Form */}
                    <div className={`mb-8 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 ${isDeskStatic ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">Add New Station to {selectedWilaya}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input 
                                placeholder="Station Name" 
                                value={newStationName}
                                onChange={e => setNewStationName(e.target.value)}
                                className="bg-black border border-neutral-700 rounded p-2 text-white" 
                            />
                            <input 
                                placeholder="Phone" 
                                value={newStationPhone}
                                onChange={e => setNewStationPhone(e.target.value)}
                                className="bg-black border border-neutral-700 rounded p-2 text-white" 
                            />
                            <input 
                                placeholder="Address" 
                                value={newStationAddress}
                                onChange={e => setNewStationAddress(e.target.value)}
                                className="bg-black border border-neutral-700 rounded p-2 text-white md:col-span-2" 
                            />
                            <input 
                                placeholder="Google Maps URL" 
                                value={newStationMap}
                                onChange={e => setNewStationMap(e.target.value)}
                                className="bg-black border border-neutral-700 rounded p-2 text-white md:col-span-2" 
                            />
                            <button 
                                onClick={handleAddStation}
                                disabled={!newStationName || processingId === 'add-station'}
                                className="bg-arrow-green text-black px-4 py-2 rounded font-bold hover:bg-emerald-400 md:col-span-2 flex justify-center"
                            >
                                {processingId === 'add-station' ? <Loader2 className="animate-spin" /> : 'Add Station'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {currentStations.length === 0 ? (
                            <div className="text-gray-500 text-center py-10 border border-dashed border-gray-700 rounded-xl">
                                No stations listed for {selectedWilaya}.
                            </div>
                        ) : (
                            currentStations.map((station, idx) => (
                                <div key={station.id || idx} className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 relative group">
                                    {!isDeskStatic && (
                                        <button 
                                            onClick={() => station.id && handleDeleteStation(station.id)}
                                            className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-900/20 rounded"
                                        >
                                            {processingId === `delete-s-${station.id}` ? <Loader2 size={20} className="animate-spin"/> : <Trash2 size={20} />}
                                        </button>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase">Station Name</label>
                                            <input 
                                                type="text" 
                                                defaultValue={station.name}
                                                readOnly={isDeskStatic}
                                                onBlur={(e) => !isDeskStatic && station.id && handleUpdateStation(station.id, 'name', e.target.value)}
                                                className={`w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none ${!isDeskStatic ? 'focus:border-arrow-green' : 'cursor-default'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase">Phone</label>
                                            <input 
                                                type="text" 
                                                defaultValue={station.phone}
                                                readOnly={isDeskStatic}
                                                onBlur={(e) => !isDeskStatic && station.id && handleUpdateStation(station.id, 'phone', e.target.value)}
                                                className={`w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none ${!isDeskStatic ? 'focus:border-arrow-green' : 'cursor-default'}`}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-gray-500 uppercase">Address</label>
                                            <input 
                                                type="text" 
                                                defaultValue={station.address}
                                                readOnly={isDeskStatic}
                                                onBlur={(e) => !isDeskStatic && station.id && handleUpdateStation(station.id, 'address', e.target.value)}
                                                className={`w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:outline-none ${!isDeskStatic ? 'focus:border-arrow-green' : 'cursor-default'}`}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-arrow-green uppercase flex items-center gap-1"><MapPin size={12}/> Google Maps URL</label>
                                            <input 
                                                type="text" 
                                                placeholder="https://maps.google.com/..."
                                                defaultValue={station.mapsUrl || ''}
                                                readOnly={isDeskStatic}
                                                onBlur={(e) => !isDeskStatic && station.id && handleUpdateStation(station.id, 'mapsUrl', e.target.value)}
                                                className={`w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-blue-400 focus:outline-none ${!isDeskStatic ? 'focus:border-arrow-green' : 'cursor-default'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Admin;