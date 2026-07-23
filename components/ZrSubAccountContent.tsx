import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResellerParcel, ZrCredentials } from '../types';
import { getMyParcels } from '../services/resellerApi';
import { generateIndividualLabels } from '../services/zrExpressApi';
import LoadingSpinner from './LoadingSpinner';
import {
  Package, Truck, RefreshCw, Search,
  MapPin, Plus, Layers, Calendar
} from 'lucide-react';

interface ZrSubAccountContentProps {
  profileId: string;
  zrCredentials?: ZrCredentials | null;
}

const ZrSubAccountContent: React.FC<ZrSubAccountContentProps> = ({ profileId, zrCredentials }) => {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<ResellerParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelLoading, setLabelLoading] = useState<string | null>(null);

  const fetchParcels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyParcels(profileId);
      setParcels(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parcels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [profileId]);

  if (loading) {
    return <div className="min-h-[400px] flex items-center justify-center"><LoadingSpinner text="Loading your parcels..." /></div>;
  }

  return (
    <div>
      <div className="bg-amber-900/10 border-b border-amber-600/30 sticky top-[80px] z-30 backdrop-blur-md">
        <div className="max-w-full mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers size={24} className="text-amber-400" /> My Parcels
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{parcels.length} parcels</span>
            <button
              onClick={fetchParcels}
              disabled={loading}
              className="bg-neutral-900 hover:bg-neutral-800 text-white border border-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/zr-create-order')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-4 py-2.5 rounded-xl font-bold transition-colors w-fit"
          >
            <Plus size={18} /> New Parcel
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">{error}</div>
        )}

        <div className="bg-arrow-dark border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-gray-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <th className="p-4 font-semibold">Tracking</th>
                  <th className="p-4 font-semibold">State</th>
                  <th className="p-4 font-semibold">COD Amount</th>
                  <th className="p-4 font-semibold">Delivery Price</th>
                  <th className="p-4 font-semibold text-right">Date</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {parcels.length > 0 ? (
                  parcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-neutral-900/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-white font-mono">{parcel.tracking_number}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm text-white bg-amber-700">
                          {parcel.state.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-medium text-amber-400">
                        {(parcel.cod_amount ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-4 font-mono text-gray-400">
                        {(parcel.my_delivery_price ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-4 text-right text-gray-500">
                        {new Date(parcel.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/track?tracking=${parcel.tracking_number}&carrier=zrexpress`)}
                            className="p-2 hover:bg-amber-600/20 rounded-lg text-amber-400 transition-colors"
                            title="View Details"
                          >
                            <Search size={18} />
                          </button>
                          {zrCredentials && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (labelLoading) return;
                                setLabelLoading(parcel.tracking_number);
                                try {
                                  const result = await generateIndividualLabels(zrCredentials, { trackingNumbers: [parcel.tracking_number] });
                                  if (result.parcelLabelFiles.length > 0) {
                                    window.open(result.parcelLabelFiles[0].fileUrl, '_blank');
                                  } else {
                                    setError('Label not available for this parcel');
                                  }
                                } catch (err: any) {
                                  setError('Print failed: ' + (err?.message || 'unknown error'));
                                }
                                setLabelLoading(null);
                              }}
                              disabled={labelLoading !== null}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 rounded-lg text-amber-400 text-xs font-bold transition-colors disabled:opacity-30"
                              title="Print Label"
                            >
                              {labelLoading === parcel.tracking_number ? (
                                <><RefreshCw size={14} className="animate-spin" /> Label</>
                              ) : (
                                <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Label</>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      No parcels yet. Create your first one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZrSubAccountContent;
