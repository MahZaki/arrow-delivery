import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { 
    TrendingUp, Users, Map, DollarSign, ArrowRight, 
    Package, Activity, AlertCircle, Settings
} from 'lucide-react';
import { WILAYAS } from '../constants';

const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { users, pricing, desks } = useData();

  // --- Real & Simulated Data Logic ---
  
  // 1. Calculate Coverage
  const coveragePercentage = Math.round((pricing.length / 58) * 100);
  
  // 2. Count Stations
  const totalStations = useMemo(() => {
      return desks.reduce((acc, curr) => acc + curr.stations.length, 0);
  }, [desks]);

  // 3. Simulate Recent Revenue (Mock Data for Visuals as we don't have financial API access)
  const revenueData = [45000, 52000, 48000, 61000, 55000, 67000, 72000]; // Last 7 days
  const maxRev = Math.max(...revenueData);

  // 4. Simulate Delivery Statuses (Mock Data)
  const deliveryStats = {
      delivered: 65,
      transit: 20,
      returned: 10,
      pending: 5
  };

  const KPICard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-lg hover:shadow-[0_0_15px_rgba(47,191,142,0.1)] transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-neutral-900 ${color}`}>
                <Icon size={24} />
            </div>
            {subtitle && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-neutral-900 ${color.replace('text-', 'text-opacity-80 ')}`}>
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
            <KPICard 
                title="Total Revenue (7d)" 
                value="400K DA" 
                subtitle="+12%" 
                icon={DollarSign} 
                color="text-emerald-400" 
            />
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
                subtitle={`${coveragePercentage}% Nat.`} 
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-arrow-green" size={20} /> Weekly Performance
                    </h3>
                    <select className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg px-3 py-1 focus:outline-none">
                        <option>Last 7 Days</option>
                        <option>Last Month</option>
                    </select>
                </div>
                
                {/* Custom CSS Chart */}
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                    {revenueData.map((val, idx) => {
                        const height = (val / maxRev) * 100;
                        return (
                            <div key={idx} className="w-full flex flex-col items-center gap-2 group cursor-pointer">
                                <div className="relative w-full max-w-[40px] bg-neutral-800 rounded-t-lg h-full flex items-end overflow-hidden">
                                    <div 
                                        style={{ height: `${height}%` }} 
                                        className="w-full bg-gradient-to-t from-arrow-deepGreen to-arrow-green opacity-70 group-hover:opacity-100 transition-all duration-300"
                                    ></div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {(val / 1000).toFixed(1)}k DA
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 font-mono">Day {idx + 1}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Delivery Stats Donut */}
            <div className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl p-6 shadow-xl flex flex-col">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Activity className="text-blue-400" size={20} /> Delivery Status
                </h3>
                
                <div className="flex-1 flex items-center justify-center relative">
                    {/* CSS Conic Gradient for Donut Chart */}
                    <div 
                        className="w-48 h-48 rounded-full relative"
                        style={{
                            background: `conic-gradient(
                                #10B981 0% ${deliveryStats.delivered}%, 
                                #F59E0B ${deliveryStats.delivered}% ${deliveryStats.delivered + deliveryStats.transit}%,
                                #EF4444 ${deliveryStats.delivered + deliveryStats.transit}% ${deliveryStats.delivered + deliveryStats.transit + deliveryStats.returned}%,
                                #3B82F6 ${deliveryStats.delivered + deliveryStats.transit + deliveryStats.returned}% 100%
                            )`
                        }}
                    >
                        <div className="absolute inset-4 bg-arrow-dark rounded-full flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white">95%</span>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Completion</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Delivered
                        </div>
                        <span className="font-bold text-white">{deliveryStats.delivered}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div> In Transit
                        </div>
                        <span className="font-bold text-white">{deliveryStats.transit}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div> Returned
                        </div>
                        <span className="font-bold text-white">{deliveryStats.returned}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div> Pending
                        </div>
                        <span className="font-bold text-white">{deliveryStats.pending}%</span>
                    </div>
                </div>
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
                        {users.slice(0, 5).map((user, i) => (
                            <tr key={user.id || i} className="hover:bg-neutral-900/50">
                                <td className="px-6 py-4 text-white font-medium">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs border border-blue-900">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-2 text-emerald-400 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                                    {user.api_token ? '••••••••••••' : <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={12}/> Pending</span>}
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