import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarrier } from '../contexts/CarrierContext';
import { fetchOrdersFromApi, fetchArchivedFromDb } from '../services/api';
import { Order, Transaction } from '../types';
import { getTransactions, getBalance, addTransaction } from '../services/transactionApi';
import { WILAYAS, STATUS_TRANSLATIONS } from '../constants';
import {
  DollarSign, TrendingUp, CreditCard, ShieldAlert,
  ArrowUpRight, BarChart3, PieChart, Calendar,
  Download, ArrowLeft, RefreshCw, Search, MapPin,
  Wallet, Plus, Minus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type TimePeriod = '7d' | '30d' | 'all';

const Finance: React.FC = () => {
  const { user } = useAuth();
  const { carrier } = useCarrier();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reseller wallet state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalanceState] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [processingDeposit, setProcessingDeposit] = useState(false);

  const loadFinanceData = async (userId: string, token: string | null) => {
    setLoading(true);
    setError(null);
    try {
      let liveOrders: Order[] = [];
      if (token) {
        try {
          liveOrders = await fetchOrdersFromApi(token);
        } catch (e) {
          console.warn("Could not fetch live orders for finance:", e);
        }
      }
      const dbArchived = await fetchArchivedFromDb(userId);

      // Merge live and archived
      const liveSet = new Set(liveOrders.map(o => o.tracking));
      const uniqueArchived = dbArchived.filter(o => !liveSet.has(o.tracking));
      setOrders([...liveOrders, ...uniqueArchived]);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to load finance statistics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadFinanceData(user.id, user.api_token);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user) return;
    loadFinanceData(user.id, user.api_token);
  }, [user]);

  // Reseller wallet: load transactions and balance
  const loadWallet = async () => {
    if (!user) return;
    setWalletLoading(true);
    try {
      const [txns, bal] = await Promise.all([
        getTransactions(user.id),
        getBalance(user.id),
      ]);
      setTransactions(txns);
      setBalanceState(bal);
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (carrier === 'zrexpress' && user) {
      loadWallet();
    }
  }, [carrier, user]);

  const handleDeposit = async () => {
    if (!user || !depositAmount || parseFloat(depositAmount) <= 0) return;
    setProcessingDeposit(true);
    try {
      await addTransaction(user.id, 'deposit', parseFloat(depositAmount), undefined, 'Wallet deposit');
      setDepositAmount('');
      setShowDeposit(false);
      await loadWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to process deposit');
    } finally {
      setProcessingDeposit(false);
    }
  };

  // Filter orders based on period and search query
  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      // Search
      const matchesSearch = searchQuery
        ? o.tracking.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.client || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      // Period filter
      if (!matchesSearch) return false;
      if (period === 'all') return true;

      const dateStr = o.created_at ? o.created_at.split('T')[0] : '';
      if (!dateStr) return false;

      const orderDate = new Date(dateStr);
      const diffTime = Math.abs(new Date().getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (period === '7d' && diffDays > 7) return false;
      if (period === '30d' && diffDays > 30) return false;

      return true;
    });
  }, [orders, period, searchQuery]);

  // Calculate metrics
  const stats = React.useMemo(() => {
    let totalCOD = 0;
    let netPayout = 0;
    let deliveryFees = 0;
    let returnFees = 0;
    
    let paidOrdersCount = 0;
    let deliveredPendingCount = 0;
    let returnedCount = 0;
    let inTransitCount = 0;

    filteredOrders.forEach(o => {
      const status = o.status?.toLowerCase();
      const montantVal = parseFloat(String(o.montant || 0));
      const prestVal = parseFloat(String(o.tarif_prestation || 0));
      const retVal = parseFloat(String(o.tarif_retour || 0));

      // In transit status indicators
      const inTransitStatuses = [
        'en_ramassage', 'en_preparation_stock', 'vers_hub', 
        'en_hub', 'vers_wilaya', 'en_preparation', 'en_livraison'
      ];

      if (status === 'paye_et_archive' || status === 'paye' || status === 'payed') {
        paidOrdersCount++;
        netPayout += montantVal;
        deliveryFees += prestVal;
        totalCOD += (montantVal + prestVal);
      } else if (
        status === 'livre_non_encaisse' || 
        status === 'encaisse_non_paye' || 
        status === 'paiements_prets' ||
        status === 'livre' ||
        status === 'livred'
      ) {
        deliveredPendingCount++;
        netPayout += montantVal;
        deliveryFees += prestVal;
        totalCOD += (montantVal + prestVal);
      } else if (status?.includes('retour')) {
        returnedCount++;
        returnFees += retVal;
      } else if (inTransitStatuses.includes(status)) {
        inTransitCount++;
      }
    });

    const totalProcessed = filteredOrders.length;
    const deliveredCount = paidOrdersCount + deliveredPendingCount;
    const successRate = totalProcessed > 0 ? (deliveredCount / totalProcessed) * 100 : 0;
    const avgTicket = deliveredCount > 0 ? (netPayout / deliveredCount) : 0;

    return {
      totalCOD,
      netPayout,
      deliveryFees,
      returnFees,
      paidOrdersCount,
      deliveredPendingCount,
      returnedCount,
      inTransitCount,
      successRate,
      avgTicket,
      totalProcessed
    };
  }, [filteredOrders]);

  // Group by Wilaya to calculate highest performing zones
  const wilayaPerformance = React.useMemo(() => {
    const perfMap: Record<string, { count: number; revenue: number; fees: number }> = {};
    
    filteredOrders.forEach(o => {
      const status = o.status?.toLowerCase();
      if (!(status === 'paye_et_archive' || status === 'paye' || status === 'payed' || status === 'livre' || status === 'livred')) return;

      const wId = String(o.wilaya_id || '');
      const wName = WILAYAS[wId] || wId || 'Unknown';
      const montantVal = parseFloat(String(o.montant || 0));
      const prestVal = parseFloat(String(o.tarif_prestation || 0));

      if (!perfMap[wName]) {
        perfMap[wName] = { count: 0, revenue: 0, fees: 0 };
      }
      perfMap[wName].count += 1;
      perfMap[wName].revenue += montantVal;
      perfMap[wName].fees += prestVal;
    });

    return Object.entries(perfMap)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8); // Top 8 Wilayas
  }, [filteredOrders]);

  // Group revenue by date for chart (last 7 days or last 10 days)
  const chartData = React.useMemo(() => {
    const dayMap: Record<string, number> = {};
    
    // Default to last 7 days of dates if empty
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dayMap[dateStr] = 0;
    }

    filteredOrders.forEach(o => {
      const status = o.status?.toLowerCase();
      if (!(status === 'paye_et_archive' || status === 'paye' || status === 'payed')) return;

      const dateStr = o.created_at ? o.created_at.split('T')[0] : '';
      if (dateStr && dayMap[dateStr] !== undefined) {
        dayMap[dateStr] += parseFloat(String(o.montant || 0));
      } else if (dateStr && period === 'all') {
        // If all time, let's keep track of dates dynamically
        dayMap[dateStr] = (dayMap[dateStr] || 0) + parseFloat(String(o.montant || 0));
      }
    });

    const entries = Object.entries(dayMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // For all time, let's only display the last 10 entries with data
    return period === 'all' ? entries.filter(e => e.amount > 0 || entries.indexOf(e) >= entries.length - 8) : entries;
  }, [filteredOrders, period]);

  const maxChartVal = Math.max(...chartData.map(d => d.amount), 1000);

  const handleExportFinanceCSV = () => {
    if (!filteredOrders.length) return;
    const headers = ['Tracking', 'Client', 'Wilaya', 'Status', 'Montant Net (DA)', 'Prestation (DA)', 'Date'];
    const rows = filteredOrders.map(o => [
      o.tracking,
      `"${(o.client || '').replace(/"/g, '""')}"`,
      WILAYAS[String(o.wilaya_id)] || o.wilaya_id || '',
      STATUS_TRANSLATIONS[o.status] || o.status,
      o.montant || 0,
      o.tarif_prestation || 0,
      o.created_at ? o.created_at.split('T')[0] : '',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_performance_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  // ZR Express → show reseller wallet
  if (carrier === 'zrexpress') {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2">
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                <Wallet className="text-amber-400" size={32} />
                My Wallet
              </h1>
            </div>
            <button onClick={loadWallet} disabled={walletLoading}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-amber-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
              <RefreshCw size={16} className={walletLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm">
              <ShieldAlert size={18} /> {error}
            </div>
          )}

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-neutral-900 to-gray-950 border border-amber-600/30 rounded-2xl p-8">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Current Balance</p>
            <p className={`text-4xl font-black ${balance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {balance.toLocaleString()} DA
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { setShowDeposit(true); setError(null); }}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-5 py-2.5 rounded-xl font-bold transition-colors">
                <Plus size={18} /> Deposit
              </button>
            </div>
          </div>

          {/* Deposit Form */}
          {showDeposit && (
            <div className="bg-neutral-900 border border-amber-600/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Add Funds</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Amount (DA)</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                    className="w-full bg-black border border-neutral-700 text-white px-4 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                    placeholder="10000" min="1" />
                </div>
                <button onClick={handleDeposit} disabled={processingDeposit || !depositAmount}
                  className="bg-amber-600 hover:bg-amber-500 text-black px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                  {processingDeposit ? 'Processing...' : 'Confirm'}
                </button>
                <button onClick={() => setShowDeposit(false)}
                  className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-white">Transaction History</h2>
            </div>
            {walletLoading ? (
              <div className="p-10 text-center text-gray-500"><RefreshCw size={24} className="animate-spin mx-auto mb-2" />Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-950">
                    <tr>
                      {['Type', 'Amount', 'Description', 'Date'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-neutral-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            tx.type === 'deposit' ? 'bg-green-950/40 text-green-400 border border-green-800/40' :
                            tx.type === 'withdrawal' ? 'bg-red-950/40 text-red-400 border border-red-800/40' :
                            tx.type === 'delivery_fee' ? 'bg-blue-950/40 text-blue-400 border border-blue-800/40' :
                            tx.type === 'return_fee' ? 'bg-orange-950/40 text-orange-400 border border-orange-800/40' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 font-mono font-bold ${
                          tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(tx.amount ?? 0) >= 0 ? '+' : ''}{(tx.amount ?? 0).toLocaleString()} DA
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{tx.description || '—'}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <DollarSign className="text-green-400" size={32} />
              Finance Performance
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Analyze your payouts, shipping costs, regional performance, and cash flows.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-1 flex gap-1 text-sm">
              <button
                onClick={() => setPeriod('7d')}
                className={`px-3 py-1.5 rounded-md transition-colors ${period === '7d' ? 'bg-green-500 text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`px-3 py-1.5 rounded-md transition-colors ${period === '30d' ? 'bg-green-500 text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${period === 'all' ? 'bg-green-500 text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                All Time
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white disabled:opacity-40"
              title="Refresh Finance Data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Export */}
            <button
              onClick={handleExportFinanceCSV}
              disabled={loading || !filteredOrders.length}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              <Download size={16} />
              Export Financials
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm">
            <ShieldAlert size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-3">
            <RefreshCw size={40} className="animate-spin text-green-400" />
            <p className="text-sm">Analyzing transactions and cash flows...</p>
          </div>
        ) : (
          <>
            {/* Core Financial Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Payout (Net Recouvert) */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-4 -mt-4"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                    <TrendingUp size={22} />
                  </div>
                  <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    Payout <ArrowUpRight size={10} />
                  </span>
                </div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Net Payout</p>
                <p className="text-2xl font-black text-white mt-1.5">{stats.netPayout.toLocaleString()} DA</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Delivered & Paid</span>
                  <span className="text-green-400 font-semibold">{stats.paidOrdersCount} orders</span>
                </div>
              </div>

              {/* Delivery Fees */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-4 -mt-4"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <CreditCard size={22} />
                  </div>
                  <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    COD Fees
                  </span>
                </div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Delivery Fees Paid</p>
                <p className="text-2xl font-black text-white mt-1.5">{stats.deliveryFees.toLocaleString()} DA</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Gross collected</span>
                  <span className="text-blue-400 font-semibold">{stats.totalCOD.toLocaleString()} DA</span>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-500/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl -mr-4 -mt-4"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                    <BarChart3 size={22} />
                  </div>
                  <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    Performance
                  </span>
                </div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Delivery Success Rate</p>
                <p className="text-2xl font-black text-white mt-1.5">{stats.successRate.toFixed(1)}%</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Return rate</span>
                  <span className="text-yellow-400 font-semibold">
                    {stats.totalProcessed > 0 ? ((stats.returnedCount / stats.totalProcessed) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-4 -mt-4"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                    <PieChart size={22} />
                  </div>
                  <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                    AOV
                  </span>
                </div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Average Order Ticket</p>
                <p className="text-2xl font-black text-white mt-1.5">{Math.round(stats.avgTicket).toLocaleString()} DA</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Total orders</span>
                  <span className="text-purple-400 font-semibold">{stats.totalProcessed}</span>
                </div>
              </div>

            </div>

            {/* Graphics and Rankings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Daily revenue trend - SVG Graph */}
              <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar size={18} className="text-green-400" />
                      Net Revenue Payout History
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Showing successful order net values group by date</p>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                    No matching sales history in this period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* SVG Chart area */}
                    <div className="relative h-64 w-full">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                        <div className="border-t border-white w-full"></div>
                      </div>

                      {/* Bar charts */}
                      <div className="absolute inset-0 flex items-end justify-between px-4 pb-2">
                        {chartData.map((d, index) => {
                          const heightPct = (d.amount / maxChartVal) * 85; // cap at 85% to leave room for labels
                          return (
                            <div key={d.date} className="flex flex-col items-center flex-grow group relative">
                              {/* Hover details tooltip */}
                              <div className="absolute bottom-full mb-2 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-[10px] text-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                <p className="text-gray-400">{d.date}</p>
                                <p className="text-green-400 font-bold mt-0.5">{d.amount.toLocaleString()} DA</p>
                              </div>
                              {/* Bar */}
                              <div
                                style={{ height: `${Math.max(heightPct, 5)}%` }}
                                className="w-8 md:w-12 bg-gradient-to-t from-green-600 to-green-400 group-hover:from-green-500 group-hover:to-green-300 rounded-t-lg transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.1)] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                              ></div>
                              <span className="text-[10px] text-gray-500 mt-2 rotate-45 md:rotate-0 origin-top-left md:origin-center text-center font-mono">
                                {d.date.split('-').slice(1).join('/')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Y-axis helper */}
                    <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-gray-800 pt-3">
                      <span>Max value in period: <strong className="text-white">{maxChartVal.toLocaleString()} DA</strong></span>
                      <span>Stats computed locally from database records</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Wilayas performance list */}
              <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <MapPin size={18} className="text-blue-400" />
                    Top Performing Wilayas
                  </h2>
                  <p className="text-xs text-gray-400 mb-6">Regions driving your highest net revenue</p>

                  {wilayaPerformance.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-10">No wilaya stats available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {wilayaPerformance.map((w, index) => {
                        const maxRevenue = wilayaPerformance[0]?.revenue || 1;
                        const barWidth = (w.revenue / maxRevenue) * 100;
                        return (
                          <div key={w.name} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-gray-200">
                                {index + 1}. {w.name}
                              </span>
                              <span className="text-white font-bold">{(w.revenue ?? 0).toLocaleString()} DA</span>
                            </div>
                            <div className="relative w-full h-2 bg-gray-950 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${barWidth}%` }}
                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                              ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>{w.count} delivered orders</span>
                              <span>Avg: {Math.round((w.revenue ?? 0) / (w.count || 1)).toLocaleString()} DA / order</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-800 pt-4 mt-6 flex justify-between text-[11px] text-gray-400">
                  <span>Returns charges: <strong className="text-red-400">{stats.returnFees.toLocaleString()} DA</strong></span>
                  <span>In transit: <strong className="text-yellow-500">{stats.inTransitCount} orders</strong></span>
                </div>
              </div>

            </div>

            {/* Financial Ledger / Transaction Log */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Financial Ledger</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Search and view financial history for orders in this period</p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search tracking or client..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 pl-9 pr-4 py-2 bg-gray-950 border border-gray-800 focus:border-green-500 focus:outline-none rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-sm">
                  No transactions match the criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/40">
                      <tr>
                        {['Tracking', 'Client', 'Wilaya', 'Status', 'Prestation', 'Net Payout', 'Date'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {filteredOrders.slice(0, 100).map(order => {
                        const status = order.status?.toLowerCase();
                        const isPaid = status === 'paye_et_archive' || status === 'payed' || status === 'paye';
                        const isPending = status === 'livre_non_encaisse' || status === 'encaisse_non_paye' || status === 'paiements_prets' || status === 'livre' || status === 'livred';
                        const isReturned = status?.includes('retour');
                        
                        return (
                          <tr key={order.tracking} className="hover:bg-gray-800/20 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs text-green-400 font-medium">
                              {order.tracking}
                            </td>
                            <td className="px-5 py-3.5 text-gray-300">{order.client || '—'}</td>
                            <td className="px-5 py-3.5 text-gray-400">
                              {WILAYAS[String(order.wilaya_id)] || order.wilaya_id || '—'}
                            </td>
                            <td className="px-5 py-3.5">
                              {isPaid ? (
                                <span className="bg-green-950/40 border border-green-800/40 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                  Paid & Settled
                                </span>
                              ) : isPending ? (
                                <span className="bg-yellow-950/40 border border-yellow-800/40 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                  Pending Payment
                                </span>
                              ) : isReturned ? (
                                <span className="bg-red-950/40 border border-red-800/40 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                  Returned Order
                                </span>
                              ) : (
                                <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                  {STATUS_TRANSLATIONS[order.status] || order.status}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-gray-300 font-mono text-xs">
                              {order.tarif_prestation ? `${Number(order.tarif_prestation).toLocaleString()} DA` : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-white font-bold font-mono text-xs">
                              {order.montant ? `${Number(order.montant).toLocaleString()} DA` : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-gray-500 text-xs">
                              {order.created_at ? order.created_at.split('T')[0] : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredOrders.length > 100 && (
                    <div className="px-5 py-4 text-center text-xs text-gray-500 border-t border-gray-800">
                      Showing first 100 of {filteredOrders.length} transactions. Use export for full CSV list.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Finance;
