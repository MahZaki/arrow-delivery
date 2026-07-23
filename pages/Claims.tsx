import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ZrCredentials, ZrClaim, ZrClaimCategory, ZrClaimStateHistoryEntry } from '../types';
import {
  searchClaims, createClaim, deleteClaim, searchClaimCategories,
  getClaimStateHistory, createClaimComment, searchParcels
} from '../services/zrExpressApi';
import {
  ArrowLeft, RefreshCw, Plus, X, Search, MessageSquare,
  AlertCircle, ChevronRight, Trash2, Send, Clock
} from 'lucide-react';

const Claims: React.FC = () => {
  const { user, resolveZrCredentials, isMaster } = useAuth();
  const navigate = useNavigate();

  const [creds, setCreds] = useState<ZrCredentials | null>(null);
  const [claims, setClaims] = useState<ZrClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [categories, setCategories] = useState<ZrClaimCategory[]>([]);
  const [createForm, setCreateForm] = useState({ title: '', description: '', categoryId: '', parcelTracking: '' });
  const [parcelSearchResults, setParcelSearchResults] = useState<any[]>([]);
  const [parcelSearching, setParcelSearching] = useState(false);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail view state
  const [selectedClaim, setSelectedClaim] = useState<ZrClaim | null>(null);
  const [claimHistory, setClaimHistory] = useState<ZrClaimStateHistoryEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    resolveZrCredentials().then(setCreds);
  }, [resolveZrCredentials]);

  const fetchClaims = useCallback(async (page: number = 1) => {
    if (!creds) return;
    setLoading(true);
    setError(null);
    try {
      const result = await searchClaims(creds, {
        pageNumber: page,
        pageSize: 15,
        orderBy: ['createdAt desc'],
        includeComments: true,
      });
      setClaims(result.items);
      setTotalCount(result.totalCount);
      setCurrentPage(result.pageNumber);
    } catch (err: any) {
      setError(err?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [creds]);

  useEffect(() => {
    if (creds) fetchClaims(1);
  }, [creds]);

  const fetchCategories = async () => {
    if (!creds) return;
    try {
      const result = await searchClaimCategories(creds);
      setCategories(result.items);
    } catch {}
  };

  const handleSearchParcels = async (query: string) => {
    if (!creds || query.length < 3) { setParcelSearchResults([]); return; }
    setParcelSearching(true);
    try {
      const result = await searchParcels(creds, {
        pageNumber: 1, pageSize: 5, keyword: query, includeProducts: false,
      });
      setParcelSearchResults(result.items);
    } catch { setParcelSearchResults([]); }
    setParcelSearching(false);
  };

  const handleCreateClaim = async () => {
    if (!creds || !createForm.title || !createForm.description || !createForm.categoryId || !selectedParcelId) return;
    setCreating(true);
    setError(null);
    try {
      await createClaim(creds, {
        title: createForm.title,
        description: createForm.description,
        categoryId: createForm.categoryId,
        parcelId: selectedParcelId,
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', categoryId: '', parcelTracking: '' });
      setSelectedParcelId('');
      setParcelSearchResults([]);
      await fetchClaims(1);
    } catch (err: any) {
      setError('Failed to create claim: ' + (err?.message || 'unknown error'));
    }
    setCreating(false);
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!creds) return;
    try {
      await deleteClaim(creds, claimId);
      setSelectedClaim(null);
      await fetchClaims(currentPage);
    } catch (err: any) {
      setError('Failed to delete claim: ' + (err?.message || 'unknown error'));
    }
  };

  const openClaimDetail = async (claim: ZrClaim) => {
    setSelectedClaim(claim);
    setNewComment('');
    if (creds) {
      try {
        const history = await getClaimStateHistory(creds, claim.id);
        setClaimHistory(history);
      } catch { setClaimHistory([]); }
    }
  };

  const handleAddComment = async () => {
    if (!creds || !selectedClaim || !newComment.trim()) return;
    setCommentLoading(true);
    try {
      await createClaimComment(creds, selectedClaim.id, newComment.trim());
      const updated = await searchClaims(creds, {
        pageNumber: 1, pageSize: 1, includeComments: true,
        advancedSearch: { fields: ['id'], keyword: selectedClaim.id },
      });
      if (updated.items.length > 0) setSelectedClaim(updated.items[0]);
      setNewComment('');
    } catch (err: any) {
      setError('Failed to add comment: ' + (err?.message || 'unknown error'));
    }
    setCommentLoading(false);
  };

  const totalPages = Math.ceil(totalCount / 15);

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <AlertCircle className="text-orange-400" size={32} />
              Claims Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track and manage parcel claims and complaints</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchClaims(currentPage)} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => { fetchCategories(); setShowCreate(true); setError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition-colors">
              <Plus size={18} /> New Claim
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search claims by title, tracking number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Claims List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <RefreshCw size={32} className="animate-spin text-orange-400" />
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-gray-500">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No claims found</p>
            <p className="text-sm mt-1">Create a new claim when you have an issue with a parcel.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims
              .filter(c => !search ||
                c.title.toLowerCase().includes(search.toLowerCase()) ||
                c.parcel?.trackingNumber?.toLowerCase().includes(search.toLowerCase()))
              .map(claim => (
              <div
                key={claim.id}
                onClick={() => openClaimDetail(claim)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-orange-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: claim.state?.color ? `#${claim.state.color}` : '#6b7280' }}
                      >
                        {claim.state?.name?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                        {claim.category?.name}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1 group-hover:text-orange-400 transition-colors">{claim.title}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2">{claim.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="font-mono">{claim.parcel?.trackingNumber}</span>
                      <span>{claim.parcel?.customerFullName}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(claim.createdAt).toLocaleDateString()}</span>
                      {claim.comments && claim.comments.length > 0 && (
                        <span className="flex items-center gap-1"><MessageSquare size={12} /> {claim.comments.length}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-orange-400 transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <button onClick={() => fetchClaims(currentPage - 1)} disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white disabled:opacity-30">Prev</button>
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <button onClick={() => fetchClaims(currentPage + 1)} disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-neutral-900 text-gray-400 hover:text-white disabled:opacity-30">Next</button>
          </div>
        )}
      </div>

      {/* Create Claim Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><AlertCircle size={18} className="text-orange-400" /> New Claim</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
              <input type="text" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                maxLength={100} placeholder="Brief title for the claim"
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-orange-500 focus:outline-none text-sm" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                maxLength={500} rows={3} placeholder="Detailed description of the issue"
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-orange-500 focus:outline-none text-sm resize-none" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select value={createForm.categoryId} onChange={e => setCreateForm({ ...createForm, categoryId: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-orange-500 focus:outline-none text-sm">
                <option value="">Select a category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Parcel (search by tracking or customer)</label>
              <input type="text" value={createForm.parcelTracking} onChange={e => {
                setCreateForm({ ...createForm, parcelTracking: e.target.value });
                handleSearchParcels(e.target.value);
              }} placeholder="Type tracking number or customer name..."
                className="w-full bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-orange-500 focus:outline-none text-sm" />
              {parcelSearching && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
              {parcelSearchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {parcelSearchResults.map(p => (
                    <button key={p.id} onClick={() => {
                      setSelectedParcelId(p.id);
                      setCreateForm({ ...createForm, parcelTracking: p.trackingNumber });
                      setParcelSearchResults([]);
                    }} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedParcelId === p.id ? 'bg-orange-600/20 text-orange-400 border border-orange-600/40' : 'bg-neutral-800 hover:bg-neutral-700 text-gray-300'}`}>
                      <span className="font-mono">{p.trackingNumber}</span> — {p.customer.name} ({p.customer.phone.number1})
                    </button>
                  ))}
                </div>
              )}
              {selectedParcelId && <p className="text-xs text-green-400 mt-1">Parcel selected</p>}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-neutral-700 transition-colors">Cancel</button>
              <button onClick={handleCreateClaim} disabled={creating || !createForm.title || !createForm.description || !createForm.categoryId || !selectedParcelId}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors disabled:opacity-30">
                {creating ? 'Creating...' : 'Create Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedClaim(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: selectedClaim.state?.color ? `#${selectedClaim.state.color}` : '#6b7280' }}>
                  {selectedClaim.state?.name?.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500 bg-neutral-800 px-2 py-0.5 rounded-full">{selectedClaim.category?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDeleteClaim(selectedClaim.id)} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400 transition-colors" title="Delete claim">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedClaim(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{selectedClaim.title}</h2>
            <p className="text-gray-400 text-sm mb-6">{selectedClaim.description}</p>

            {/* Parcel info */}
            {selectedClaim.parcel && (
              <div className="bg-neutral-800 rounded-lg p-4 mb-6">
                <p className="text-xs text-gray-500 uppercase mb-2">Related Parcel</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-white">{selectedClaim.parcel.trackingNumber}</p>
                    <p className="text-xs text-gray-400">{selectedClaim.parcel.customerFullName} · {selectedClaim.parcel.phone}</p>
                  </div>
                  <span className="text-xs text-gray-500">{selectedClaim.parcel.stateName?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            )}

            {/* State History */}
            {claimHistory.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><Clock size={14} /> State History</h4>
                <div className="space-y-2">
                  {claimHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-1" />
                        {i < claimHistory.length - 1 && <div className="w-0.5 h-6 bg-neutral-700" />}
                      </div>
                      <div>
                        <p className="text-gray-300">
                          <span className="text-gray-500">{h.previousState?.name?.replace(/_/g, ' ') || 'Created'}</span>
                          {' → '}
                          <span className="text-white font-medium">{h.newState.name?.replace(/_/g, ' ')}</span>
                        </p>
                        <p className="text-gray-500">{h.modifiedBy?.fullName} · {new Date(h.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {selectedClaim.comments && selectedClaim.comments.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><MessageSquare size={14} /> Comments</h4>
                <div className="space-y-2">
                  {selectedClaim.comments.map(c => (
                    <div key={c.id} className="bg-neutral-800 rounded-lg p-3">
                      <p className="text-sm text-gray-300">{c.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{c.modifiedBy?.fullName} · {new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Comment */}
            <div className="flex gap-2">
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                placeholder="Add a comment..."
                className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-3 py-2 rounded-lg focus:border-orange-500 focus:outline-none text-sm" />
              <button onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-30">
                {commentLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claims;
