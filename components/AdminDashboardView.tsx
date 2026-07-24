import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { getSupplierBalance, getParcelStats, searchParcels, searchSupplierPayments } from '../services/zrExpressApi';
import { ZrCredentials, ZrSupplierBalance } from '../types';
import { 
    TrendingUp, Users, Map, DollarSign, ArrowRight, 
    Package, Activity, AlertCircle, Settings, Layers,
    Truck, CheckCircle, Building2, Wallet, Clock,
    RefreshCw, Loader
} from 'lucide-react';
import { WILAYAS } from '../constants';

const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { users, pricing, desks } = useData();
  const { user, resolveZrCredentials } = useAuth();

  const [creds, setCreds] = useState<ZrCredentials | null>(null);
  const [balance, setBalance] = useState<ZrSupplierBalance | null>(null);
  const [parcelStats, setParcelStats] = useState<Array<{ stateId: string; stateName: string; count: number; color: string }>>([]);
  const [totalParcels, setTotalParcels] = useState(0);
  const [todayShipped, setTodayShipped] = useState(0);
  const [todayDelivered, setTodayDelivered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentsTotal, setPaymentsTotal] = useState(0);

  useEffect(() => {
    resolveZrCredentials().then(setCreds);
  }, [resolveZrCredentials]);

  useEffect(() => {
    if (!creds) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const [bal, stats] = await Promise.all([
          getSupplierBalance(creds),
          getParcelStats(creds),
        ]);
        setBalance(bal);
        setParcelStats(stats);
        const total = stats.reduce((a, s) => a + s.count, 0);
        setTotalParcels(total);

        const [todayRes, todayDelRes, paysRes] = await Promise.all([
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
          searchSupplierPayments(creds, { pageNumber: 1, pageSize: 50, orderBy: ['createdAt desc'] }),
        ]);
        setTodayShipped(todayRes.totalCount);
        setTodayDelivered(todayDelRes.totalCount);
        setPaymentsTotal(paysRes.items.reduce((a, p) => a + (p.status === 'Accepted' ? p.amount : 0), 0));
      } catch {}
      setLoading(false);
    })();
  }, [creds]);

  const coveragePercentage = Math.round((pricing.length / 58) * 100);
  const totalStations = useMemo(() => {
    return desks.reduce((acc, curr) => acc + curr.stations.length, 0);
  }, [desks]);

  const deliveredCount = parcelStats.find(s => s.stateName === 'Livré')?.count || 0;
  const totalCount = parcelStats.reduce((a, s) => a + s.count, 0);
  const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;
  const inTransitCount = parcelStats
    .filter(s => !['Livré', 'Annulé'].includes(s.stateName))
    .reduce((a, s) => a + s.count, 0);

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

  if (loading && creds) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-arrow-gray">
          <Loader size={20} className="animate-spin" />
          Loading dashboard data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-arrow-deepGreen pb-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Command Center</h1>
                <p className="text-gray-400 mt-1">Overview of logistics performance and system status.</p>
            </div>
            <button 
                onClick={() => navigate('/admin')}
                className="bg-arrow-green hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-arrow-green/20"
            >
                <Settings size={20} /> Manage Data & CMS
            </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creds ? (
              <KPICard 
                  title="ZR Treasury Balance" 
                  value={balance ? `${balance.balance.toLocaleString()} DA` : '—'} 
                  subtitle={balance?.pendingAmount ? `${balance.pendingAmount.toLocaleString()} DA pending` : ''} 
                  icon={Wallet} 
                  color="text-arrow-green" 
              />
            ) : (
              <KPICard 
                  title="Total Revenue (7d)" 
                  value="—" 
                  subtitle="Connect ZR" 
                  icon={DollarSign} 
                  color="text-emerald-400" 
              />
            )}
            <KPICard 
                title="Registered Clients" 
                value={users.length} 
                subtitle="Active" 
                icon={Users} 
                color="text-blue-400" 
            />
            <KPICard 
                title="Network Coverage" 
                value={`${pricing.length} Cities`} 
                subtitle={`${coveragePercentage}% National`} 
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

        {/* Operational Stats (only when ZR connected) */}
        {creds && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
                <div className="text-2xl font-bold text-white">{totalParcels.toLocaleString()}</div>
                <div className="text-xs text-arrow-gray/70 mt-1 flex items-center gap-1"><Layers size={14} /> Total Parcels</div>
              </div>
              <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
                <div className="text-2xl font-bold text-blue-400">{todayShipped.toLocaleString()}</div>
                <div className="text-xs text-blue-400/70 mt-1 flex items-center gap-1"><Clock size={14} /> Shipped Today</div>
              </div>
              <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
                <div className="text-2xl font-bold text-emerald-400">{todayDelivered.toLocaleString()}</div>
                <div className="text-xs text-emerald-400/70 mt-1 flex items-center gap-1"><CheckCircle size={14} /> Delivered Today</div>
              </div>
              <div className="bg-arrow-dark border border-arrow-deepGreen/20 rounded-xl p-5">
                <div className="text-2xl font-bold text-cyan-400">{inTransitCount.toLocaleString()}</div>
                <div className="text-xs text-cyan-400/70 mt-1 flex items-center gap-1"><Truck size={14} /> In Transit</div>
              </div>
            </div>

            {/* State Breakdown */}
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
          </>
        )}

        {!creds && (
          <div className="bg-neutral-900/50 border border-arrow-deepGreen/20 rounded-2xl p-8 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-arrow-gray/50" />
            <p className="text-arrow-gray text-sm">Connect ZR Express credentials in <button onClick={() => navigate('/admin')} className="text-arrow-green hover:underline">Admin &gt; Users</button> to see real-time parcel statistics.</p>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Revenue / Payments Bar Chart */}
            <div className="lg:col-span-2 bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-arrow-green" size={20} /> Performance Overview
                    </h3>
                    <span className="text-xs text-arrow-gray/50">
                        {totalCount} total parcels · {balance ? `${balance.balance.toLocaleString()} DA` : '—'}
                    </span>
                </div>
                
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                    {parcelStats.length > 0 ? (
                      parcelStats.map((s, idx) => {
                        const pct = totalCount > 0 ? (s.count / totalCount) * 100 : 0;
                        return (
                          <div key={s.stateId} className="w-full flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative w-full max-w-[40px] bg-neutral-800 rounded-t-lg h-full flex items-end overflow-hidden">
                              <div 
                                style={{ height: `${pct}%` }} 
                                className="w-full bg-gradient-to-t from-arrow-deepGreen to-arrow-green opacity-70 group-hover:opacity-100 transition-all duration-300"
                              ></div>
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {s.count} ({Math.round(pct)}%)
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[60px] truncate">{s.stateName}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full text-center text-arrow-gray/50 py-12">No parcel data available. Connect ZR Express to see stats.</div>
                    )}
                </div>
            </div>

            {/* Delivery Stats Donut */}
            <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-xl flex flex-col">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Activity className="text-blue-400" size={20} /> Delivery Status
                </h3>
                
                {totalCount > 0 ? (
                  <>
                    <div className="flex-1 flex items-center justify-center relative">
                      <div 
                        className="w-48 h-48 rounded-full relative"
                        style={{
                          background: `conic-gradient(
                            #10B981 0% ${deliveryRate}%, 
                            #F59E0B ${deliveryRate}% ${deliveryRate + Math.round((inTransitCount / totalCount) * 100) > 100 ? 100 : deliveryRate + Math.round((inTransitCount / totalCount) * 100)}%,
                            #EF4444 ${deliveryRate + Math.round((inTransitCount / totalCount) * 100) > 100 ? 100 : deliveryRate + Math.round((inTransitCount / totalCount) * 100)}% 100%
                          )`
                        }}
                      >
                        <div className="absolute inset-4 bg-arrow-dark rounded-full flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white">{deliveryRate}%</span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Delivered</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Delivered
                        </div>
                        <span className="font-bold text-white">{deliveredCount} ({deliveryRate}%)</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div> In Transit
                        </div>
                        <span className="font-bold text-white">{inTransitCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelled/Other
                        </div>
                        <span className="font-bold text-white">{totalCount - deliveredCount - inTransitCount}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-arrow-gray/50 text-sm">
                    No data yet. Connect ZR Express.
                  </div>
                )}
            </div>
        </div>

        {/* Recent Clients Table */}
        <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-arrow-deepGreen flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-arrow-green" size={20} /> Recently Registered Clients
                </h3>
                <button onClick={() => navigate('/admin')} className="text-sm text-arrow-green hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Client Email</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">API Token</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.slice(0, 5).map((u, i) => (
                            <tr key={u.id || i} className="hover:bg-neutral-900/50">
                                <td className="px-6 py-4 text-white font-medium">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs border border-blue-900">
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-2 text-emerald-400 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                                    {u.api_token ? '••••••••••••' : <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={12}/> Pending</span>}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default AdminDashboardView;
