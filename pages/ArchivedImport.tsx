import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { importArchivedOrders, fetchArchivedFromDb, fetchOrdersByTrackings, saveToArchive } from '../services/api';
import { Order } from '../types';
import { STATUS_TRANSLATIONS, WILAYAS } from '../constants';
import {
  Upload, CheckCircle, XCircle, Archive, RefreshCw,
  ClipboardList, AlertCircle, Download, Trash2, DollarSign, FileUp, Eye
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
  const [refetchingRevenue, setRefetchingRevenue] = useState(false);

  // CSV Upload state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ tracking: string; montant: number }[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvApplying, setCsvApplying] = useState(false);
  const [csvResult, setCsvResult] = useState<{ updated: number; notFound: number } | null>(null);

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

  // Re-fetch estimated_fee for orders that have montant = 0
  const handleRefetchRevenue = async () => {
    if (!user?.api_token || !user?.id) return;
    const zeroRevenue = archivedOrders.filter(o => !o.montant || o.montant === 0);
    if (!zeroRevenue.length) return;

    setRefetchingRevenue(true);
    try {
      const trackings = zeroRevenue.map(o => o.tracking);
      const updated = await fetchOrdersByTrackings(trackings, user.api_token, 'all');
      if (updated.length) {
        await saveToArchive(updated, user.id);
        const refreshed = await fetchArchivedFromDb(user.id);
        setArchivedOrders(refreshed);
      }
    } catch (err) {
      console.error('Revenue refetch failed:', err);
    } finally {
      setRefetchingRevenue(false);
    }
  };

  // ── CSV Upload ───────────────────�  const handleCsvFile = (file: File) => {
    setCsvError(null);
    setCsvPreview([]);
    setCsvResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row.');

        // Detect delimiter (comma, semicolon, tab)
        const delim = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';

        // Parse CSV respecting quoted fields (Ecotrack wraps multi-product rows in quotes)
        const parseCsvLine = (line: string): string[] => {
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === delim && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
            current += ch;
          }
          cols.push(current.trim());
          return cols;
        };

        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());

        // Column index detection
        // Ecotrack export: Tracking, Réference, déstinataire, Téléphone, Commune, Wilaya,
        //                  Produits, Remarque, Poids, Livré le, Encaissé le, montant,
        //                  Frais de livraison, ..., Crée le
        const col = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));

        const trackingIdx = col(['tracking']);
        const montantIdx  = col(['montant']);
        const clientIdx   = col(['déstinataire', 'destinataire', 'client', 'nom_client']);
        const wilayaIdx   = col(['wilaya']);
        const communeIdx  = col(['commune']);
        const produitIdx  = col(['produit']);
        const dateIdx     = col(['crée le', 'cree le', 'created_at']);

        if (trackingIdx === -1) throw new Error(`Could not find "Tracking" column. Headers: ${headers.join(', ')}`);
        if (montantIdx  === -1) throw new Error(`Could not find "montant" column. Headers: ${headers.join(', ')}`);

        const parsed: {
          tracking: string;
          montant: number;
          client?: string;
          wilaya?: string;
          commune?: string;
          produit?: string;
          created_at?: string;
        }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const tracking = cols[trackingIdx]?.trim().toUpperCase();
          if (!tracking) continue;

          // montant format is "6300/" or "6300/4000" — take the first number
          const rawMontant = cols[montantIdx] || '';
          const montant = parseFloat(rawMontant.split('/')[0].replace(/[^\d.]/g, '') || '0');

          if (!tracking || montant <= 0) continue;

          parsed.push({
            tracking,
            montant,
            client:     clientIdx  !== -1 ? cols[clientIdx]?.trim()  : undefined,
            wilaya:     wilayaIdx  !== -1 ? cols[wilayaIdx]?.trim()  : undefined,
            commune:    communeIdx !== -1 ? cols[communeIdx]?.trim() : undefined,
            produit:    produitIdx !== -1 ? cols[produitIdx]?.trim() : undefined,
            created_at: dateIdx    !== -1 ? cols[dateIdx]?.split(' ')[0]?.trim() : undefined,
          });
        }

        if (!parsed.length) throw new Error('No valid rows found with both tracking and montant > 0.');
        setCsvPreview(parsed as any);
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

  const handleApplyCsv = async () => {
    if (!csvPreview.length || !user?.id) return;
    setCsvApplying(true);
    setCsvResult(null);
    try {
      let updated = 0;
      let notFound = 0;
      // Batch update in Supabase - also enrich client/products/created_at
      for (const row of csvPreview) {
        const updatePayload: Record<string, any> = {
          montant: row.montant,
          updated_at: new Date().toISOString(),
        };
        if ((row as any).client)     updatePayload.client     = (row as any).client;
        if ((row as any).wilaya)     updatePayload.wilaya     = (row as any).wilaya;
        if ((row as any).produit)    updatePayload.products   = (row as any).produit;
        if ((row as any).created_at) updatePayload.created_at = (row as any).created_at;
        const { error } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('tracking', row.tracking)
          .eq('user_id', user.id);
        if (error) { notFound++; } else { updated++; }
      }
      setCsvResult({ updated, notFound });
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
                onClick={handleRefetchRevenue}
                disabled={refetchingRevenue || !archivedOrders.some(o => !o.montant)}
                className="p-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 rounded-lg transition-colors"
                title="Re-fetch revenue for orders with missing amounts"
              >
                {refetchingRevenue
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <DollarSign size={16} />}
              </button>
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

        {/* CSV Upload — update montant from Ecotrack export */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileUp size={20} className="text-yellow-400" />
            <h2 className="text-lg font-semibold">Update Amounts from CSV</h2>
          </div>
          <p className="text-sm text-gray-400">
            Export your archived orders from the Ecotrack web dashboard as CSV, then upload it here to fill in the missing <strong className="text-white">montant</strong> values.
            The CSV must have a <code className="bg-gray-800 px-1 rounded text-xs">tracking</code> column and a <code className="bg-gray-800 px-1 rounded text-xs">montant</code> column (also accepts: amount, total, valeur, cod).
          </p>

          {/* Drop zone */}
          <div
            onDrop={handleCsvDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => csvInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-yellow-500 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <FileUp size={32} className="mx-auto mb-2 text-gray-600 group-hover:text-yellow-400 transition-colors" />
            <p className="text-gray-400 text-sm">Drag & drop a CSV file here, or <span className="text-yellow-400 underline">click to browse</span></p>
            <p className="text-gray-600 text-xs mt-1">Supports comma, semicolon, and tab-delimited files</p>
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
                <p className="text-gray-500 text-xs mt-2">
                  Tip: make sure the column header is exactly one of: <em>tracking, montant, amount, total, valeur, cod</em>
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Eye size={16} className="text-yellow-400" />
                  <span>Preview — <strong className="text-white">{csvPreview.length}</strong> rows detected</span>
                </div>
                <button
                  onClick={handleApplyCsv}
                  disabled={csvApplying}
                  className="flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {csvApplying
                    ? <><RefreshCw size={14} className="animate-spin" /> Applying...</>
                    : <><CheckCircle size={14} /> Apply {csvPreview.length} updates</>
                  }
                </button>
              </div>

              <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800 max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">#</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Tracking</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Montant (DA)</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">In DB?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {csvPreview.slice(0, 100).map((row, i) => {
                      const inDb = archivedOrders.some(o => o.tracking === row.tracking);
                      return (
                        <tr key={row.tracking} className="hover:bg-gray-900">
                          <td className="px-3 py-1.5 text-gray-600">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono text-green-400">{row.tracking}</td>
                          <td className="px-3 py-1.5 text-white font-medium">{row.montant.toLocaleString()} DA</td>
                          <td className="px-3 py-1.5">
                            {inDb
                              ? <span className="text-green-400">✓ Yes</span>
                              : <span className="text-yellow-500">⚠ Not imported yet</span>
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
              <p className="text-xs text-gray-500">
                ⚠ Only orders already in your archive DB will be updated. Rows marked "Not imported yet" will be skipped — import their tracking numbers first.
              </p>
            </div>
          )}

          {/* Apply result */}
          {csvResult && (
            <div className="bg-green-950/30 border border-green-800 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-400 shrink-0" size={20} />
              <div>
                <p className="text-green-300 font-medium">
                  Updated <strong className="text-white">{csvResult.updated}</strong> orders with correct montant
                </p>
                {csvResult.notFound > 0 && (
                  <p className="text-yellow-400 text-xs mt-1">
                    {csvResult.notFound} rows were skipped (not found in archive — import their tracking numbers first)
                  </p>
                )}
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
