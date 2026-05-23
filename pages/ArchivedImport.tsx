import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchArchivedFromDb } from '../services/api';
import { Order } from '../types';
import { STATUS_TRANSLATIONS, WILAYAS } from '../constants';
import {
  CheckCircle, XCircle, Archive, RefreshCw,
  ClipboardList, Download, Trash2, DollarSign, FileUp, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const ArchivedImport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(true);

  // CSV Upload state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ tracking: string; montant: number }[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvApplying, setCsvApplying] = useState(false);
  const [csvResult, setCsvResult] = useState<{ inserted: number; updated: number; failed: number } | null>(null);

  // Load existing archived orders
  useEffect(() => {
    if (!user?.id) return;
    setLoadingArchived(true);
    fetchArchivedFromDb(user.id)
      .then(setArchivedOrders)
      .finally(() => setLoadingArchived(false));
  }, [user?.id]);

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    if (!window.confirm('Delete ALL archived orders from the database? This cannot be undone.')) return;
    await supabase.from('orders').delete().eq('user_id', user.id);
    setArchivedOrders([]);
  };

  // -- CSV parsing --
  const handleCsvFile = (file: File) => {
    setCsvError(null);
    setCsvPreview([]);
    setCsvResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row.');

        const delim = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';

        // Quoted-CSV parser handles commas inside quoted fields
        const parseLine = (line: string): string[] => {
          const cols: string[] = [];
          let cur = '', inQ = false;
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') { inQ = !inQ; continue; }
            if (c === delim && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
            cur += c;
          }
          cols.push(cur.trim());
          return cols;
        };

        // Strip French accents for robust header matching
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const headers = parseLine(lines[0]).map(norm);

        const col = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));

        const trackingIdx = col(['tracking']);
        const netIdx      = col(['net recouvert', 'net recouvre', 'net_recouvert']);

        if (trackingIdx === -1) throw new Error(`Cannot find "Tracking" column. Headers found: ${headers.join(', ')}`);
        if (netIdx === -1) throw new Error(`Cannot find "Net recouvert" column. Headers found: ${headers.join(', ')}`);

        const parsed: { tracking: string; montant: number }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseLine(lines[i]);
          const tracking = cols[trackingIdx]?.trim().toUpperCase();
          if (!tracking) continue;
          // Net recouvert = actual payout to seller after delivery fees
          const raw = cols[netIdx]?.replace(/[^\d.\-]/g, '') || '0';
          const montant = parseFloat(raw);
          // Include all rows, even 0 or negative (exchanges)
          parsed.push({ tracking, montant });
        }

        if (!parsed.length) throw new Error('No valid rows found in the CSV. Check the file format.');
        setCsvPreview(parsed);
      } catch (err: any) {
        setCsvError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  };

  // Apply CSV: upsert directly into orders table
  const handleApplyCsv = async () => {
    if (!csvPreview.length || !user?.id) return;
    setCsvApplying(true);
    setCsvResult(null);
    try {
      let inserted = 0;
      let updated = 0;
      let failed = 0;

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < csvPreview.length; i += batchSize) {
        const batch = csvPreview.slice(i, i + batchSize);

        const rows = batch.map(row => ({
          tracking: row.tracking,
          user_id: user.id,
          montant: row.montant,
          status: 'paye_et_archive',
          client: '',
          wilaya_id: '',
          created_at: new Date().toISOString().split('T')[0],
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
          .from('orders')
          .upsert(rows, { onConflict: 'tracking' })
          .select('tracking');

        if (error) {
          console.error('Batch upsert error:', error.message);
          failed += batch.length;
        } else {
          // Check which ones already existed vs new
          const existingTrackings = archivedOrders.map(o => o.tracking);
          for (const row of batch) {
            if (existingTrackings.includes(row.tracking)) {
              updated++;
            } else {
              inserted++;
            }
          }
        }
      }

      setCsvResult({ inserted, updated, failed });
      setCsvPreview([]);
      if (csvInputRef.current) csvInputRef.current.value = '';

      // Refresh list
      const refreshed = await fetchArchivedFromDb(user.id);
      setArchivedOrders(refreshed);
    } catch (err) {
      console.error(err);
    } finally {
      setCsvApplying(false);
    }
  };

  const handleExportCSV = () => {
    if (!archivedOrders.length) return;
    const headers = ['Tracking', 'Client', 'Wilaya', 'Status', 'Net Recouvert (DA)', 'Date'];
    const rows = archivedOrders.map(o => [
      o.tracking,
      `"${(o.client || '').replace(/"/g, '""')}"`,
      WILAYAS[String(o.wilaya_id)] || o.wilaya_id || '',
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
              Upload your Ecotrack CSV to import delivered & paid orders with their net recouvert amounts.
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
            <p className="text-gray-400 text-sm">Total Revenue (Net Recouvert)</p>
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

        {/* CSV Upload Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileUp size={20} className="text-green-400" />
            <h2 className="text-lg font-semibold">Import Orders from CSV</h2>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-4 text-sm text-blue-300">
            <p className="font-medium mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-400">
              <li>Go to your Ecotrack dashboard → filter by <strong>Payé et archivé</strong></li>
              <li>Export the list as CSV</li>
              <li>Upload the CSV here — the system reads <code className="bg-blue-900/50 px-1 rounded text-xs">Tracking</code> and <code className="bg-blue-900/50 px-1 rounded text-xs">Net recouvert</code> columns</li>
              <li>Review the preview and click <strong>Import</strong></li>
            </ol>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleCsvDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => csvInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-green-500 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <FileUp size={32} className="mx-auto mb-2 text-gray-600 group-hover:text-green-400 transition-colors" />
            <p className="text-gray-400 text-sm">Drag & drop your Ecotrack CSV file here, or <span className="text-green-400 underline">click to browse</span></p>
            <p className="text-gray-600 text-xs mt-1">Required columns: <strong>Tracking</strong> + <strong>Net recouvert</strong></p>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); }}
            />
          </div>

          {/* Error */}
          {csvError && (
            <div className="bg-red-950/40 border border-red-800 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-red-300 font-medium text-sm">Could not parse CSV</p>
                <p className="text-red-400 text-xs mt-1">{csvError}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Eye size={16} className="text-green-400" />
                  <span>Preview — <strong className="text-white">{csvPreview.length}</strong> orders detected</span>
                  <span className="text-gray-500 ml-2">
                    (Total: <strong className="text-blue-400">{csvPreview.reduce((s, r) => s + r.montant, 0).toLocaleString()} DA</strong>)
                  </span>
                </div>
                <button
                  onClick={handleApplyCsv}
                  disabled={csvApplying}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {csvApplying
                    ? <><RefreshCw size={14} className="animate-spin" /> Importing...</>
                    : <><CheckCircle size={14} /> Import {csvPreview.length} orders</>
                  }
                </button>
              </div>

              <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800 max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">#</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Tracking</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Net Recouvert (DA)</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {csvPreview.slice(0, 100).map((row, i) => {
                      const exists = archivedOrders.some(o => o.tracking === row.tracking);
                      return (
                        <tr key={row.tracking + i} className="hover:bg-gray-900">
                          <td className="px-3 py-1.5 text-gray-600">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono text-green-400">{row.tracking}</td>
                          <td className="px-3 py-1.5 text-white font-medium">{row.montant.toLocaleString()} DA</td>
                          <td className="px-3 py-1.5">
                            {exists
                              ? <span className="text-yellow-500 text-xs">⟳ Will update</span>
                              : <span className="text-green-400 text-xs">+ New</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {csvPreview.length > 100 && (
                  <p className="text-center text-xs text-gray-600 py-2">Showing first 100 of {csvPreview.length} rows</p>
                )}
              </div>
            </div>
          )}

          {/* Import result */}
          {csvResult && (
            <div className="bg-green-950/30 border border-green-800 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-400 shrink-0" size={20} />
              <div>
                <p className="text-green-300 font-medium">
                  Import complete!
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  <strong className="text-white">{csvResult.inserted}</strong> new orders added
                  {csvResult.updated > 0 && <>, <strong className="text-white">{csvResult.updated}</strong> existing orders updated</>}
                  {csvResult.failed > 0 && <>, <strong className="text-red-400">{csvResult.failed}</strong> failed</>}
                </p>
              </div>
            </div>
          )}
        </div>

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
              <p className="text-sm mt-1">Upload a CSV file above to import them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    {['Tracking', 'Client', 'Wilaya', 'Status', 'Net Recouvert', 'Date'].map(h => (
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
                        <span className="bg-green-900/40 text-green-300 text-xs px-2 py-1 rounded-full">
                          {STATUS_TRANSLATIONS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
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
