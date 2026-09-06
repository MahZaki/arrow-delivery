import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getSupplierBalance, getParcelStats, searchParcels } from '../services/zrExpressApi';
import { ZrCredentials, ZrSupplierBalance, UserProfile } from '../types';
import { 
    TrendingUp, Users, Map, DollarSign, ArrowRight, 
    Package, Activity, AlertCircle, Settings, Layers,
    Truck, CheckCircle, Building2, Wallet, Clock,
    RefreshCw, Loader, ShoppingCart, MessageSquare
} from 'lucide-react';

const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { users, pricing, desks, refreshUsers } = useData();

  // Self-healing client list: DataContext loads `users` once per admin session,
  // but if the consumer mounted before that resolved (or state was lost), fetch
  // the profiles directly so the table/KPI never sit empty.
  const [localUsers, setLocalUsers] = useState<UserProfile[]>(users);
  useEffect(() => { setLocalUsers(users); }, [users]);
  useEffect(() => {
    if (users.length === 0) {
      refreshUsers().catch(() => {});
    }
  }, [users, refreshUsers]);
  const { user, resolveZrCredentials } = useAuth();

  // DB stats (always available)
  const [dbStats, setDbStats] = useState({
    totalCrmOrders: 0,
    totalResellerParcels: 0,
    totalWhatsAppCampaigns: 0,
    profilesWithZr: 0,
    profilesWithToken: 0,
  });
  const [dbLoading, setDbLoading] = useState(true);

  // ZR stats (only if creds configured)
  const [creds, setCreds] = useState<ZrCredentials | null>(null);
  const [balance, setBalance] = useState<ZrSupplierBalance | null>(null);
  const [parcelStats, setParcelStats] = useState<Array<{ stateId: string; stateName: string; count: number; color: string }>>([]);
  const [todayShipped, setTodayShipped] = useState(0);
  const [todayDelivered, setTodayDelivered] = useState(0);
  const [zrLoading, setZrLoading] = useState(false);
  const [zrError, setZrError] = useState<string | null>(null);

  // Fetch DB stats
  useEffect(() => {
    (async () => {
      try {
        const [crm, reseller, whatsapp, zrProfiles, tokenProfiles] = await Promise.all([
          supabase.from('crm_orders').select('id', { count: 'exact', head: true }),
          supabase.from('reseller_parcels').select('id', { count: 'exact', head: true }),
          supabase.from('whatsapp_campaigns').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).not('zr_tenant_id', 'is', null),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).not('api_token', 'is', null),
        ]);
        setDbStats({
          totalCrmOrders: crm.count ?? 0,
          totalResellerParcels: reseller.count ?? 0,
          totalWhatsAppCampaigns: whatsapp.count ?? 0,
          profilesWithZr: zrProfiles.count ?? 0,
          profilesWithToken: tokenProfiles.count ?? 0,
        });
      } catch {}
      setDbLoading(false);
    })();
  }, []);

  // ZR stats
  useEffect(() => {
    resolveZrCredentials().then(setCreds);
  }, [resolveZrCredentials]);

  const loadZrData = useCallback(async () => {
    if (!creds) return;
    setZrLoading(true);
    setZrError(null);
    try {
      const [bal, stats] = await Promise.all([
        getSupplierBalance(creds),
        getParcelStats(creds),
      ]);
      setBalance(bal);
      setParcelStats(stats);

      const [todayRes, todayDelRes] = await Promise.all([
        searchParcels(creds, {
          pageNumber: 1, pageSize: 1,
          orderBy: ['createdAt desc'],
          advancedFilter: {
            logic: 'AND',
            filters: [{ field: 'createdAt', operator: '>=', value: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' }],
          },
        }),
        searchParcels(creds, {
          pageNumber: 1, pageSize: 1,
          orderBy: ['createdAt desc'],
          advancedFilter: {
            logic: 'AND',
            filters: [
              { field: 'createdAt', operator: '>=', value: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' },
              { field: 'state.name', operator: '==', value: 'Livré' },
            ],
          },
        }),
      ]);
      setTodayShipped(todayRes.totalCount);
      setTodayDelivered(todayDelRes.totalCount);
    } catch (err: any) {
      setZrError(err?.message || 'ZR Express data unavailable — network error or invalid credentials.');
    }
    setZrLoading(false);
  }, [creds]);

  useEffect(() => {
    loadZrData();
  }, [loadZrData]);

  const coveragePercentage = Math.round((pricing.length / 58) * 100);
  const totalStations = useMemo(() => desks.reduce((acc, curr) => acc + curr.stations.length, 0), [desks]);

  const deliveredCount = parcelStats.find(s => s.stateName === 'Livré')?.count || 0;
  const totalParcels = parcelStats.reduce((a, s) => a + s.count, 0);
  const deliveryRate = totalParcels > 0 ? Math.round((deliveredCount / totalParcels) * 100) : 0;
  const inTransitCount = parcelStats.filter(s => !['Livré', 'Annulé'].includes(s.stateName)).reduce((a, s) => a + s.count, 0);

  const KPICard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-lg hover:shadow-[0_0_15px_rgba(47,191,142,0.1)] transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-neutral-900 ${color}`}>
                <Icon size={24} />
            </div>
            {subtitle && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-neutral-900 ${color}`}>
                    {subtitle}
                </span>
            )}
        </div>
        <div>
            <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
            <p className="text-gray-400 text-sm">{title}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-arrow-deepGreen pb-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Command Center</h1>
                <p className="text-gray-400 mt-1">Business overview &amp; logistics performance.</p>
            </div>
            <button 
                onClick={() => navigate('/admin')}
                className="bg-arrow-green hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-arrow-green/20"
            >
                <Settings size={20} /> Manage Data
            </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creds && balance ? (
              <KPICard 
                  title="ZR Treasury Balance" 
                  value={`${balance.balance.toLocaleString()} DA`}
                  subtitle={balance.pendingAmount ? `${balance.pendingAmount.toLocaleString()} DA pending` : ''}
                  icon={Wallet} 
                  color="text-arrow-green" 
              />
            ) : (
              <KPICard 
                  title="CRM Orders" 
                  value={dbLoading ? '...' : dbStats.totalCrmOrders.toLocaleString()}
                  subtitle="Total"
                  icon={ShoppingCart} 
                  color="text-arrow-green" 
              />
            )}
            <KPICard 
                title="Registered Clients" 
                value={localUsers.length} 
                subtitle="Active" 
                icon={Users} 
                color="text-blue-400" 
            />
            <KPICard 
                title="Network Coverage" 
                value={`${pricing.length} Cities`} 
                subtitle={`${coveragePercentage}%`} 
                icon={Map} 
                color="text-amber-400" 
            />
            <KPICard 
                title="Pickup Stations" 
                value={totalStations} 
                subtitle="Operational" 
                icon={Package} 
                color="text-purple-400" 
            />
        </div>

        {/* ZR data availability */}
        {creds && zrError && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-900/20 border border-amber-600/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-200">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <span>ZR Express data unavailable — showing local database stats instead.</span>
            </div>
            <button
              onClick={loadZrData}
              disabled={zrLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-colors w-fit"
            >
              <RefreshCw size={12} className={zrLoading ? 'animate-spin' : ''} /> Retry
            </button>
          </div>
        )}

        {/* Operational Stats Row */}
        {creds ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-white">{totalParcels.toLocaleString() || (zrLoading ? '...' : '0')}</div>
              <div className="text-xs text-arrow-gray/70 mt-1 flex items-center gap-1"><Layers size={14} /> Total Parcels</div>
            </div>
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-blue-400">{todayShipped.toLocaleString() || (zrLoading ? '...' : '0')}</div>
              <div className="text-xs text-blue-400/70 mt-1 flex items-center gap-1"><Clock size={14} /> Shipped Today</div>
            </div>
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-emerald-400">{todayDelivered.toLocaleString() || (zrLoading ? '...' : '0')}</div>
              <div className="text-xs text-emerald-400/70 mt-1 flex items-center gap-1"><CheckCircle size={14} /> Delivered Today</div>
            </div>
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-cyan-400">{inTransitCount.toLocaleString() || (zrLoading ? '...' : '0')}</div>
              <div className="text-xs text-cyan-400/70 mt-1 flex items-center gap-1"><Truck size={14} /> In Transit</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-white">{dbLoading ? '...' : dbStats.totalCrmOrders.toLocaleString()}</div>
              <div className="text-xs text-arrow-gray/70 mt-1 flex items-center gap-1"><ShoppingCart size={14} /> CRM Orders</div>
            </div>
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-blue-400">{dbLoading ? '...' : dbStats.totalResellerParcels.toLocaleString()}</div>
              <div className="text-xs text-blue-400/70 mt-1 flex items-center gap-1"><Package size={14} /> Parcels</div>
            </div>
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-purple-400">{dbLoading ? '...' : dbStats.totalWhatsAppCampaigns.toLocaleString()}</div>
              <div className="text-xs text-purple-400/70 mt-1 flex items-center gap-1"><MessageSquare size={14} /> WhatsApp Campaigns</div>
            </div>
            <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
              <div className="text-2xl font-bold text-amber-400">{dbLoading ? '...' : `${dbStats.profilesWithZr} / ${dbStats.profilesWithToken}`}</div>
              <div className="text-xs text-amber-400/70 mt-1 flex items-center gap-1"><Users size={14} /> ZR / Token Users</div>
            </div>
          </div>
        )}

        {/* State Breakdown (ZR only) */}
        {parcelStats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {parcelStats.map(s => (
              <div key={s.stateId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color ? `#${s.color}` : '#6b7280' }} />
                <span className="text-arrow-gray">{s.stateName}</span>
                <span className="text-white font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* ZR setup prompt */}
        {!creds && (
          <div className="bg-neutral-900/50 border border-arrow-deepGreen/20 rounded-2xl p-6 text-center">
            <Building2 size={36} className="mx-auto mb-3 text-arrow-gray/50" />
            <p className="text-arrow-gray text-sm mb-1">ZR Express not connected.</p>
            <p className="text-arrow-gray/60 text-xs">Go to <button onClick={() => navigate('/admin')} className="text-arrow-green hover:underline">Admin &gt; Users</button> to add Tenant ID &amp; API Key for real-time parcel stats.</p>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-arrow-green" size={20} /> Parcel State Distribution
                    </h3>
                    <span className="text-xs text-arrow-gray/50">
                        {totalParcels > 0 ? `${totalParcels} total parcels` : '—'}
                    </span>
                </div>
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                    {parcelStats.length > 0 ? (
                      parcelStats.map(s => {
                        const pct = totalParcels > 0 ? (s.count / totalParcels) * 100 : 0;
                        return (
                          <div key={s.stateId} className="w-full flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative w-full max-w-[40px] bg-neutral-800 rounded-t-lg h-full flex items-end overflow-hidden">
                              <div style={{ height: `${pct}%` }} className="w-full bg-gradient-to-t from-arrow-deepGreen to-arrow-green opacity-70 group-hover:opacity-100 transition-all duration-300"></div>
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {s.count} ({Math.round(pct)}%)
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[60px] truncate">{s.stateName}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full text-center text-arrow-gray/50 py-16 text-sm">
                        {creds && zrLoading ? 'Loading parcel data...' : 'Connect ZR Express to see state distribution.'}
                      </div>
                    )}
                </div>
            </div>

            <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-xl flex flex-col">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Activity className="text-blue-400" size={20} /> Delivery Rate
                </h3>
                {totalParcels > 0 ? (
                  <>
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="w-48 h-48 rounded-full relative" style={{
                        background: `conic-gradient(#10B981 0% ${deliveryRate}%, #F59E0B ${deliveryRate}% ${Math.min(100, deliveryRate + Math.round((inTransitCount / totalParcels) * 100))}%, #EF4444 ${Math.min(100, deliveryRate + Math.round((inTransitCount / totalParcels) * 100))}% 100%)`
                      }}>
                        <div className="absolute inset-4 bg-arrow-dark rounded-full flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white">{deliveryRate}%</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Delivered</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-gray-300"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Delivered</span>
                        <span className="font-bold text-white">{deliveredCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-gray-300"><span className="w-3 h-3 rounded-full bg-amber-500"></span> In Transit</span>
                        <span className="font-bold text-white">{inTransitCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-gray-300"><span className="w-3 h-3 rounded-full bg-red-500"></span> Other</span>
                        <span className="font-bold text-white">{totalParcels - deliveredCount - inTransitCount}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-arrow-gray/50 text-sm">
                    {creds && zrLoading ? 'Loading...' : 'No data yet.'}
                  </div>
                )}
            </div>
        </div>

        {/* Recent Clients Table */}
        <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-arrow-deepGreen flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-arrow-green" size={20} /> Registered Clients
                </h3>
                <button onClick={() => navigate('/admin')} className="text-sm text-arrow-green hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Carrier</th>
                            <th className="px-6 py-4">API / ZR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {localUsers.slice(0, 5).map((u, i) => (
                            <tr key={u.id || i} className="hover:bg-neutral-900/50">
                                <td className="px-6 py-4 text-white font-medium">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs border ${u.role === 'admin' ? 'bg-amber-900/30 text-amber-400 border-amber-900' : 'bg-blue-900/30 text-blue-400 border-blue-900'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-arrow-gray">
                                    {u.carrier || 'ecotrack'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1">
                                        {u.api_token ? <span className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded">API</span> : null}
                                        {u.zr_tenant_id ? <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded">ZR</span> : null}
                                        {!u.api_token && !u.zr_tenant_id ? <span className="text-[10px] text-arrow-gray/50">—</span> : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {localUsers.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default AdminDashboardView;
