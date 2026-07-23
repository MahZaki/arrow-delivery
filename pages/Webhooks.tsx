import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ZrCredentials, ZrWebhookEndpoint } from '../types';
import { listWebhookEndpoints, createWebhookEndpoint, deleteWebhookEndpoint, getWebhookEndpointSecret } from '../services/zrExpressApi';
import {
  ArrowLeft, RefreshCw, Plus, X, Webhook, Trash2,
  Copy, Check, Eye, EyeOff, ShieldAlert
} from 'lucide-react';

const WEBHOOK_EVENTS = [
  { value: 'parcel.state.updated', label: 'Parcel State Updated' },
  { value: 'parcel.state.situation.created', label: 'Parcel Situation Created' },
  { value: 'parcel.isReturn.updated', label: 'Parcel Return Updated' },
];

const Webhooks: React.FC = () => {
  const { user, resolveZrCredentials } = useAuth();
  const navigate = useNavigate();

  const [creds, setCreds] = useState<ZrCredentials | null>(null);
  const [endpoints, setEndpoints] = useState<ZrWebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ url: '', description: '', eventTypes: [] as string[], headerKey: '', headerValue: '' });
  const [creating, setCreating] = useState(false);

  // Secret viewing
  const [secretMap, setSecretMap] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { resolveZrCredentials().then(setCreds); }, [resolveZrCredentials]);

  const fetchEndpoints = useCallback(async () => {
    if (!creds) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listWebhookEndpoints(creds);
      setEndpoints(result.endpoints || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [creds]);

  useEffect(() => { if (creds) fetchEndpoints(); }, [creds]);

  const handleCreate = async () => {
    if (!creds || !createForm.url) return;
    setCreating(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (createForm.headerKey && createForm.headerValue) {
        headers[createForm.headerKey] = createForm.headerValue;
      }
      await createWebhookEndpoint(creds, {
        url: createForm.url,
        description: createForm.description || undefined,
        eventTypes: createForm.eventTypes.length > 0 ? createForm.eventTypes : null,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
      setShowCreate(false);
      setCreateForm({ url: '', description: '', eventTypes: [], headerKey: '', headerValue: '' });
      await fetchEndpoints();
    } catch (err: any) {
      setError('Failed to create webhook: ' + (err?.message || 'unknown error'));
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!creds) return;
    try {
      await deleteWebhookEndpoint(creds, id);
      await fetchEndpoints();
    } catch (err: any) {
      setError('Failed to delete webhook: ' + (err?.message || 'unknown error'));
    }
  };

  const handleRevealSecret = async (id: string) => {
    if (!creds || secretMap[id]) { setShowSecret({ ...showSecret, [id]: !showSecret[id] }); return; }
    try {
      const result = await getWebhookEndpointSecret(creds, id);
      setSecretMap({ ...secretMap, [id]: result.secret });
      setShowSecret({ ...showSecret, [id]: true });
    } catch (err: any) {
      setError('Failed to get secret: ' + (err?.message || 'unknown error'));
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEvent = (event: string) => {
    setCreateForm(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(event)
        ? prev.eventTypes.filter(e => e !== event)
        : [...prev.eventTypes, event],
    }));
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Webhook className="text-purple-400" size={32} />
              Webhooks
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage webhook endpoints for real-time parcel events (max 5 endpoints)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchEndpoints} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">
              <Plus size={18} /> Add Endpoint
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm">
            <ShieldAlert size={18} /> {error}
          </div>
        )}

        {/* Endpoints List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <RefreshCw size={32} className="animate-spin text-purple-400" />
          </div>
        ) : endpoints.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-gray-500">
            <Webhook size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No webhook endpoints</p>
            <p className="text-sm mt-1">Create a webhook endpoint to receive real-time parcel state updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {endpoints.map(ep => (
              <div key={ep.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-mono text-sm break-all">{ep.url}</p>
                    {ep.description && <p className="text-gray-400 text-xs mt-1">{ep.description}</p>}
                  </div>
                  <button onClick={() => handleDelete(ep.id)} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400 transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {ep.eventTypes && ep.eventTypes.length > 0 ? (
                    ep.eventTypes.map(et => (
                      <span key={et} className="text-xs bg-purple-950/40 text-purple-400 border border-purple-800/40 px-2 py-0.5 rounded-full">
                        {et}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs bg-neutral-800 text-gray-400 px-2 py-0.5 rounded-full">All events</span>
                  )}
                  <span className="text-xs text-gray-500">Created {new Date(ep.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Secret */}
                <div className="flex items-center gap-2 bg-neutral-950 rounded-lg p-2">
                  <code className="text-xs text-gray-400 flex-1 font-mono truncate">
                    {showSecret[ep.id] && secretMap[ep.id] ? secretMap[ep.id] : '••••••••••••••••••••'}
                  </code>
                  <button onClick={() => handleRevealSecret(ep.id)} className="p-1.5 hover:bg-neutral-800 rounded text-gray-400 transition-colors" title={showSecret[ep.id] ? 'Hide' : 'Reveal'}>
                    {showSecret[ep.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {showSecret[ep.id] && secretMap[ep.id] && (
                    <button onClick={() => handleCopy(secretMap[ep.id], ep.id)} className="p-1.5 hover:bg-neutral-800 rounded text-gray-400 transition-colors" title="Copy">
                      {copiedId === ep.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Types Reference */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Available Event Types</h3>
          <div className="space-y-2">
            {WEBHOOK_EVENTS.map(e => (
              <div key={e.value} className="flex items-center gap-3 text-xs">
                <code className="text-purple-400 font-mono">{e.value}</code>
                <span className="text-gray-500">— {e.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Webhooks are delivered via Svix with HMAC-SHA256 signature verification. Verify using the <code className="text-purple-400">svix-id</code>, <code className="text-purple-400">svix-timestamp</code>, and <code className="text-purple-400">svix-signature</code> headers.</p>
        </div>
      </div>

      {/* Create Endpoint Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Webhook size={18} className="text-purple-400" /> Add Webhook Endpoint</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">URL <span className="text-red-400">*</span></label>
              <input type="url" value={createForm.url} onChange={e => setCreateForm({ ...createForm, url: e.target.value })}
                placeholder="https://yourapp.com/webhooks/zrexpress"
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none text-sm" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <input type="text" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Production webhook endpoint"
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none text-sm" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Event Types (leave empty for all)</label>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map(e => (
                  <label key={e.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={createForm.eventTypes.includes(e.value)} onChange={() => toggleEvent(e.value)}
                      className="rounded border-neutral-600 bg-neutral-800 text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm text-gray-300">{e.label}</span>
                    <code className="text-xs text-gray-500 font-mono">{e.value}</code>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Custom Header (optional)</label>
              <div className="flex gap-2">
                <input type="text" value={createForm.headerKey} onChange={e => setCreateForm({ ...createForm, headerKey: e.target.value })}
                  placeholder="Authorization" className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none text-sm" />
                <input type="text" value={createForm.headerValue} onChange={e => setCreateForm({ ...createForm, headerValue: e.target.value })}
                  placeholder="Bearer token" className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none text-sm" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createForm.url}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-30">
                {creating ? 'Creating...' : 'Create Endpoint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Webhooks;
