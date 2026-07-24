import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserProfile, ZrCredentials } from '../types';
import { supabase } from '../lib/supabase';
import { syncZrParcelsToReseller } from '../services/resellerApi';
import { syncZrParcelsToCrm } from '../services/crmService';
import { 
    Loader2, Lock, Users, Save, 
    AlertCircle, CheckCircle, XCircle, X, Truck, Box, RefreshCw
} from 'lucide-react';

const Admin: React.FC = () => {
  const {
    user, isMaster,
    createSubAccount, updateSubAccountMarkup, updateUserCarrier,
  } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'users' | 'subs'>('users');
  const [processingId, setProcessingId] = useState<number | string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Sub-account state
  const [subEmail, setSubEmail] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subCarrier, setSubCarrier] = useState<'ecotrack' | 'zrexpress'>('zrexpress');
  const [subMarkupType, setSubMarkupType] = useState<'flat' | 'percentage'>('flat');
  const [subMarkupValue, setSubMarkupValue] = useState(0);
  const [creatingSub, setCreatingSub] = useState(false);
  const [subAccounts, setSubAccounts] = useState<UserProfile[]>([]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [syncingZr, setSyncingZr] = useState(false);

  const handleSyncZr = async () => {
    if (!user?.zr_tenant_id || !user?.zr_api_key) {
      showToast('error', 'Set your ZR credentials first');
      return;
    }
    setSyncingZr(true);
    try {
      const creds: ZrCredentials = { tenantId: user.zr_tenant_id, apiKey: user.zr_api_key };
      const result = await syncZrParcelsToReseller(user.id, creds);
      const crmCount = await syncZrParcelsToCrm(user.id, creds);
      showToast('success', `ZR sync: ${result.inserted} new, ${result.updated} updated (CRM: ${crmCount})`);
    } catch (err: any) {
      showToast('error', 'ZR sync failed: ' + err.message);
    } finally {
      setSyncingZr(false);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setAllUsers(data as UserProfile[]);
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (!isMaster) return;
    supabase.from('profiles').select('*').eq('master_id', user!.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSubAccounts(data as UserProfile[]); });
  }, [isMaster, user]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const handleUpdateZrCredentials = async (userId: string, tenantId: string, apiKey: string) => {
    setProcessingId(`zr-${userId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ zr_tenant_id: tenantId || null, zr_api_key: apiKey || null })
      .eq('id', userId);
    setProcessingId(null);
    if (!error) { showToast('success', 'ZR credentials updated'); loadUsers(); }
    else showToast('error', 'Failed to update ZR credentials');
  };

  const handleUpdateUserToken = async (userId: string, newToken: string) => {
    setProcessingId(`token-${userId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ api_token: newToken || null })
      .eq('id', userId);
    setProcessingId(null);
    if (!error) { showToast('success', 'Token updated'); loadUsers(); }
    else showToast('error', 'Failed to update token');
  };

  const handleUpdateWaSenderKey = async (userId: string, apiKey: string) => {
    setProcessingId(`wa-${userId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ wa_sender_api_key: apiKey || null })
      .eq('id', userId);
    setProcessingId(null);
    if (!error) { showToast('success', 'WaSender key updated'); loadUsers(); }
    else showToast('error', 'Failed to update WaSender key');
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

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">Admin Panel</h1>
        <button onClick={handleSyncZr} disabled={syncingZr}
          className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50 text-sm font-bold">
          {syncingZr ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {syncingZr ? 'Syncing ZR...' : 'Sync ZR Orders'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-arrow-deepGreen">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'text-arrow-green border-b-2 border-arrow-green' : 'text-gray-400 hover:text-white'}`}
        >
          <Users size={20} /> Users
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
          <h2 className="text-xl font-bold text-white mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-950 text-arrow-green">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Carrier</th>
                  <th className="px-4 py-3">API Token</th>
                  <th className="px-4 py-3">ZR Tenant ID</th>
                  <th className="px-4 py-3">ZR API Key</th>
                  <th className="px-4 py-3">WaSender Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arrow-deepGreen/30">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-900">
                    <td className="p-4 text-white">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        defaultValue={u.carrier || 'ecotrack'}
                        onChange={async (e) => {
                          const carrier = e.target.value as 'ecotrack' | 'zrexpress';
                          setProcessingId(`carrier-${u.id}`);
                          await updateUserCarrier(u.id, carrier);
                          setProcessingId(null);
                          showToast('success', `Carrier updated to ${carrier}`);
                          loadUsers();
                        }}
                        className="bg-black border border-neutral-700 rounded px-3 py-1.5 text-white text-sm focus:border-arrow-green focus:outline-none"
                      >
                        <option value="ecotrack">Ecotrack</option>
                        <option value="zrexpress">ZR Express</option>
                      </select>
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
                          disabled={processingId === `token-${u.id}`}
                          className="text-arrow-green hover:text-emerald-400 disabled:opacity-50 shrink-0"
                        >
                          {processingId === `token-${u.id}` ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          defaultValue={u.zr_tenant_id || ''} 
                          placeholder="—"
                          id={`zr-tenant-${u.id}`}
                          className="bg-black border border-neutral-700 rounded px-3 py-2 text-white w-full focus:border-amber-500 focus:outline-none font-mono text-xs"
                        />
                        <button 
                          onClick={() => {
                            const tenantInput = document.getElementById(`zr-tenant-${u.id}`) as HTMLInputElement;
                            const keyInput = document.getElementById(`zr-key-${u.id}`) as HTMLInputElement;
                            handleUpdateZrCredentials(u.id, tenantInput.value, keyInput.value);
                          }}
                          disabled={processingId === `zr-${u.id}`}
                          className="text-amber-400 hover:text-amber-300 disabled:opacity-50 shrink-0"
                        >
                          {processingId === `zr-${u.id}` ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          defaultValue={u.zr_api_key || ''} 
                          placeholder="—"
                          id={`zr-key-${u.id}`}
                          className="bg-black border border-neutral-700 rounded px-3 py-2 text-white w-full focus:border-amber-500 focus:outline-none font-mono text-xs"
                        />
                        <button 
                          onClick={() => {
                            const keyInput = document.getElementById(`zr-key-${u.id}`) as HTMLInputElement;
                            const tenantInput = document.getElementById(`zr-tenant-${u.id}`) as HTMLInputElement;
                            handleUpdateZrCredentials(u.id, tenantInput.value, keyInput.value);
                          }}
                          disabled={processingId === `zr-${u.id}`}
                          className="text-amber-400 hover:text-amber-300 disabled:opacity-50 shrink-0"
                        >
                          {processingId === `zr-${u.id}` ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          defaultValue={u.wa_sender_api_key || ''} 
                          placeholder="—"
                          id={`wa-key-${u.id}`}
                          className="bg-black border border-neutral-700 rounded px-3 py-2 text-white w-full focus:border-emerald-500 focus:outline-none font-mono text-xs"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById(`wa-key-${u.id}`) as HTMLInputElement;
                            handleUpdateWaSenderKey(u.id, input.value);
                          }}
                          disabled={processingId === `wa-${u.id}`}
                          className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 shrink-0"
                        >
                          {processingId === `wa-${u.id}` ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {allUsers.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500">No users found.</td></tr>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="email" value={subEmail} onChange={e => setSubEmail(e.target.value)}
                placeholder="Email" className="bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none" />
              <input type="password" value={subPassword} onChange={e => setSubPassword(e.target.value)}
                placeholder="Password" className="bg-black border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none" />
              <div className="flex gap-2 items-center bg-black border border-neutral-700 rounded-xl px-4 py-2.5">
                <span className="text-gray-500 text-sm flex items-center gap-1">
                  {subCarrier === 'zrexpress' ? <Truck size={14} /> : <Box size={14} />}
                  Carrier:
                </span>
                <select value={subCarrier} onChange={e => setSubCarrier(e.target.value as 'ecotrack' | 'zrexpress')}
                  className="bg-transparent text-white focus:outline-none text-sm flex-1">
                  <option value="zrexpress">ZR Express</option>
                  <option value="ecotrack">Ecotrack</option>
                </select>
              </div>
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
                const result = await createSubAccount(subEmail, subPassword, subCarrier, subMarkupType, subMarkupValue);
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
                  <th className="px-4 py-3">Carrier</th>
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
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${sa.carrier === 'zrexpress' ? 'bg-amber-900/50 text-amber-300' : 'bg-blue-900/50 text-blue-300'}`}>
                        {sa.carrier === 'zrexpress' ? <Truck size={12} /> : <Box size={12} />}
                        {sa.carrier || 'ecotrack'}
                      </span>
                    </td>
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
                      <span className="ml-1 text-xs text-gray-500">{sa.markup_type === 'flat' ? 'DA' : '%'}</span>
                    </td>
                    <td className="p-4">
                      <select
                        defaultValue={sa.carrier || 'zrexpress'}
                        onChange={async (e) => {
                          const carrier = e.target.value as 'ecotrack' | 'zrexpress';
                          setProcessingId(`carrier-${sa.id}`);
                          await updateUserCarrier(sa.id, carrier);
                          setProcessingId(null);
                          showToast('success', 'Carrier updated');
                          const { data } = await supabase.from('profiles').select('*').eq('master_id', user!.id);
                          if (data) setSubAccounts(data as UserProfile[]);
                        }}
                        className="bg-black border border-neutral-700 rounded px-3 py-1.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                      >
                        <option value="zrexpress">ZR Express</option>
                        <option value="ecotrack">Ecotrack</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {subAccounts.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No sub-accounts yet. Create one above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
