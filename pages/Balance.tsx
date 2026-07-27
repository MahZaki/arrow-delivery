import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupplierBalance, searchSupplierPayments, acceptSupplierPayment } from '../services/zrExpressApi';
import { ZrSupplierBalance, ZrSupplierPayment, ZrCredentials } from '../types';
import {
  Wallet, RefreshCw, ArrowUpRight, CheckCircle, Clock,
  DollarSign, TrendingUp, FileText, Building2, Loader
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Balance: React.FC = () => {
  const { user, resolveZrCredentials } = useAuth();
  const [creds, setCreds] = useState<ZrCredentials | null>(null);
  const [balance, setBalance] = useState<ZrSupplierBalance | null>(null);
  const [payments, setPayments] = useState<ZrSupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!creds) return;
    setLoading(true);
    setError(null);
    try {
      const [bal, pays] = await Promise.all([
        getSupplierBalance(creds),
        searchSupplierPayments(creds, {
          pageNumber: 1,
          pageSize: 50,
          orderBy: ['createdAt desc'],
          includeTransactions: true,
        }),
      ]);
      setBalance(bal);
      setPayments(pays.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveZrCredentials().then(setCreds);
  }, [resolveZrCredentials]);

  useEffect(() => {
    if (creds) loadData();
  }, [creds]);

  const handleAccept = async (paymentId: string) => {
    if (!creds) return;
    setAcceptingId(paymentId);
    try {
      await acceptSupplierPayment(creds, paymentId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-DZ', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-arrow-light flex items-center gap-3">
            <Wallet className="text-amber-400" size={28} />
            ZR Balance
          </h1>
          <p className="text-arrow-gray text-sm mt-1">Treasury overview & payment history</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-600/30 text-amber-400 hover:bg-amber-600/10 transition-all text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!creds && !loading && (
        <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-lg p-8 text-center">
          <Building2 size={40} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">ZR Express credentials not configured.</p>
          <p className="text-gray-500 text-sm mt-1">Set your Tenant ID & API Key in Admin &gt; Users.</p>
        </div>
      )}

      {loading && creds ? (
        <div className="py-20"><LoadingSpinner text="Loading balance..." /></div>
      ) : !creds ? null : (
        <>
          {/* Balance Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <DollarSign size={16} className="text-amber-400" />
                Available Balance
              </div>
              <div className="text-3xl font-bold text-white">
                {balance ? formatCurrency(balance.balance) : '—'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock size={16} className="text-yellow-400" />
                Pending Amount
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                {balance?.pendingAmount != null ? formatCurrency(balance.pendingAmount) : '—'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-6">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <TrendingUp size={16} className="text-blue-400" />
                Total Collected
              </div>
              <div className="text-3xl font-bold text-blue-400">
                {balance?.totalCollected != null ? formatCurrency(balance.totalCollected) : '—'}
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center gap-2">
              <FileText size={18} className="text-amber-400" />
              <h2 className="font-semibold text-white">Payment History</h2>
              <span className="text-xs text-arrow-gray/50 ml-auto">{payments.length} payments</span>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-arrow-gray/60 text-sm">No payments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-gray-400 uppercase text-[11px] tracking-wider">
                      <th className="text-left px-6 py-3 font-medium">Reference</th>
                      <th className="text-left px-6 py-3 font-medium">Date</th>
                      <th className="text-right px-6 py-3 font-medium">Amount</th>
                      <th className="text-center px-6 py-3 font-medium">Status</th>
                      <th className="text-right px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-white">
                          {p.referenceId || '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-white">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            p.status === 'Accepted'
                              ? 'bg-green-500/10 text-green-400'
                              : p.status === 'Pending'
                              ? 'bg-yellow-400/10 text-yellow-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {p.status === 'Accepted' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {p.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {p.status !== 'Accepted' ? (
                            <button
                              onClick={() => handleAccept(p.id)}
                              disabled={acceptingId === p.id}
                              className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-xs disabled:opacity-50"
                            >
                              {acceptingId === p.id ? (
                                <Loader size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle size={12} />
                              )}
                              Accept
                            </button>
                          ) : (
                            <span className="text-xs text-arrow-gray/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Balance;
