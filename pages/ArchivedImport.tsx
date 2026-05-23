import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { importArchivedOrders, fetchArchivedFromDb } from '../services/api';
import { Order } from '../types';
import { STATUS_TRANSLATIONS, WILAYAS } from '../constants';
import {
  Upload, CheckCircle, XCircle, Archive, RefreshCw,
  ClipboardList, AlertCircle, Download, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const ArchivedImport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rawInput, setRawInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    saved: number;
    failed: string[];
    orders: Order[];
  } | null>(null);

  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(true);

  // Load existing archived orders
  useEffect(() => {
    if (!user?.id) return;
    setLoadingArchived(true);
    fetchArchivedFromDb(user.id)
      .then(setArchivedOrders)
      .finally(() => setLoadingArchived(false));
  }, [user?.id]);

  const handleImport = async () => {
    if (!rawInput.trim() || !user?.api_token || !user?.id) return;

    setImporting(true);
    setResult(null);
    try {
      const trackings = rawInput
        .split(/[\n,;]+/)
        .map(t => t.trim())
        .filter(Boolean);

      const res = await importArchivedOrders(trackings, user.api_token, user.id);
      setResult(res);

      // Refresh the archived list
      const updated = await fetchArchivedFromDb(user.id);
      setArchivedOrders(updated);
      setRawInput('');
    } catch (err: any) {
      setResult({ saved: 0, failed: [], orders: [] });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    if (!window.confirm('Delete ALL archived orders from the database? This cannot be undone.')) return;
    await supabase.from('orders').delete().eq('user_id', user.id);
    setArchivedOrders([]);
  };

  const handleExportCSV = () => {
    if (!archivedOrders.length) return;
    const headers = ['Tracking', 'Client', 'Wilaya', 'Status', 'Amount', 'Date'];
    const rows = archivedOrders.map(o => [
      o.tracking,
      `"${(o.client || '').replace(/"/g, '""')}"`,
      WILAYAS[String(o.wilaya_id)] || o.wilaya_id,
      STATUS_TRANSLATIONS[o.status] || o.status,
      o.montant,
      o.created_at,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archived_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const totalArchived = archivedOrders.length;
  const totalRevenue = archivedOrders.reduce((sum, o) => sum + (o.montant || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Archive className="text-green-400" size={28} />
              Archived Orders
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Import tracking numbers of paid & archived orders to preserve them permanently.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">Total Archived</p>
            <p className="text-3xl font-bold text-green-400 mt-1">
              {loadingArchived ? '...' : totalArchived.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">Total Revenue (Archived)</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">
              {loadingArchived ? '...' : `${totalRevenue.toLocaleString()} DA`}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Actions</p>
              <p className="text-sm text-gray-300 mt-1">Export or clear archive</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                disabled={!totalArchived}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors"
                title="Export CSV"
              >
                <Download size={16} />
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={!totalArchived}
                className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg transition-colors"
                title="Delete all archived"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Import section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={20} className="text-green-400" />
            <h2 className="text-lg font-semibold">Import Tracking Numbers</h2>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-4 text-sm text-blue-300">
            <p className="font-medium mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-400">
              <li>Go to your Ecotrack dashboard → filter by <strong>Payé et archivé</strong></li>
              <li>Copy all tracking numbers (one per line, or comma/semicolon separated)</li>
              <li>Paste them below and click Import</li>
            </ol>
          </div>

          <textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder={`Paste tracking numbers here...\nExample:\nECVJDJ260108303581\nECVJDJ260108303582\nECVJDJ260108303583`}
            rows={8}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-500 resize-y"
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {rawInput.trim()
                ? `${rawInput.split(/[\n,;]+/).filter(t => t.trim()).length} tracking numbers detected`
                : 'No input yet'}
            </p>
            <button
              onClick={handleImport}
              disabled={importing || !rawInput.trim() || !user?.api_token}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {importing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import
                </>
              )}
            </button>
          </div>

          {!user?.api_token && (
            <p className="text-yellow-500 text-sm flex items-center gap-2">
              <AlertCircle size={14} />
              API token not set. Go to Dashboard settings to add your token.
            </p>
          )}
        </div>

        {/* Import result */}
        {result && (
          <div className={`rounded-xl border p-5 space-y-3 ${
            result.saved > 0 ? 'bg-green-950/30 border-green-800' : 'bg-red-950/30 border-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {result.saved > 0
                ? <CheckCircle className="text-green-400" size={24} />
                : <XCircle className="text-red-400" size={24} />
              }
              <div>
                <p className="font-semibold text-white">
                  {result.saved > 0
                    ? `Successfully imported ${result.saved} order${result.saved !== 1 ? 's' : ''}`
                    : 'No orders could be imported'}
                </p>
                {result.failed.length > 0 && (
                  <p className="text-sm text-yellow-400 mt-1">
                    {result.failed.length} tracking number{result.failed.length !== 1 ? 's' : ''} not found in the API
                  </p>
                )}
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Not found (may be too old for filter API):</p>
                <p className="text-xs font-mono text-red-300 break-all">
                  {result.failed.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Archived orders table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-gray-400" />
              <h2 className="font-semibold">Archived Orders in Database</h2>
              <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                {totalArchived}
              </span>
            </div>
          </div>

          {loadingArchived ? (
            <div className="p-10 text-center text-gray-500">Loading...</div>
          ) : archivedOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <Archive size={40} className="mx-auto mb-3 opacity-30" />
              <p>No archived orders yet.</p>
              <p className="text-sm mt-1">Use the import form above to add them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    {['Tracking', 'Client', 'Wilaya', 'Status', 'Amount', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {archivedOrders.slice(0, 200).map(order => (
                    <tr key={order.tracking} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-green-400">{order.tracking}</td>
                      <td className="px-4 py-3 text-gray-300">{order.client || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {WILAYAS[String(order.wilaya_id)] || order.wilaya_id || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                          {STATUS_TRANSLATIONS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {order.montant ? `${Number(order.montant).toLocaleString()} DA` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{order.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {archivedOrders.length > 200 && (
                <div className="px-4 py-3 text-center text-sm text-gray-500 border-t border-gray-800">
                  Showing first 200 of {archivedOrders.length} archived orders. Export CSV for full list.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ArchivedImport;
