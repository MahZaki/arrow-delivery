import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Search, MapPin, Building, Phone, ExternalLink, ChevronDown } from 'lucide-react';

const ZONE_LABELS: Record<number, string> = {
  0: 'Zone 0 — Alger',
  1: 'Zone 1 — Nord proche',
  2: 'Zone 2 — Nord',
  3: 'Zone 3 — Centre',
  4: 'Zone 4 — Sud',
  5: 'Zone 5 — Grand Sud',
};

const TIER_COLORS = {
  silver:   { bg: 'bg-slate-500/10',   border: 'border-slate-400/40',   text: 'text-slate-300',   label: '🥈 Silver' },
  gold:     { bg: 'bg-yellow-500/10',  border: 'border-yellow-400/40',  text: 'text-yellow-300',  label: '🥇 Gold' },
  platinum: { bg: 'bg-emerald-500/10', border: 'border-emerald-400/40', text: 'text-emerald-300', label: '💎 Platinum' },
};

type Tier = 'silver' | 'gold' | 'platinum';

const Pricing: React.FC = () => {
  const { pricing, desks, loadingData } = useData();
  const [activeTab, setActiveTab] = useState<'pricing' | 'desks'>('pricing');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTier, setActiveTier] = useState<Tier>('silver');

  const filteredPricing = pricing.filter(item =>
    item.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDesks = desks.filter(item =>
    item.wilaya.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.stations.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group by zone
  const byZone = filteredPricing.reduce<Record<number, typeof filteredPricing>>((acc, item) => {
    const z = item.zone ?? 2;
    if (!acc[z]) acc[z] = [];
    acc[z].push(item);
    return acc;
  }, {});

  const tc = TIER_COLORS[activeTier];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-arrow-green to-arrow-deepGreen bg-clip-text text-transparent mb-4">
          Pricing & Locations
        </h1>
        <p className="text-arrow-gray">Transparent delivery rates and our network of 102 stop-desk bureaux.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-arrow-dark border border-arrow-deepGreen rounded-xl p-1 inline-flex">
          {(['pricing', 'desks'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
              className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-arrow-green text-black shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'pricing' ? 'Delivery Rates' : 'Stop-Desk Bureaux'}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-8 relative">
        <Search className="absolute left-4 top-4 text-arrow-green" size={20} />
        <input
          type="text"
          placeholder={activeTab === 'pricing' ? 'Search wilaya...' : 'Search wilaya or bureau...'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-arrow-dark border border-arrow-deepGreen text-white pl-12 pr-6 py-4 rounded-xl focus:border-arrow-green focus:shadow-[0_0_15px_rgba(47,191,142,0.2)] focus:outline-none transition-all"
        />
      </div>

      {loadingData ? (
        <div className="text-center py-20 text-arrow-green animate-pulse">Loading data...</div>
      ) : (
        <>
          {/* ── PRICING TAB ── */}
          {activeTab === 'pricing' && (
            <div className="animate-fade-in">

              {/* Tier selector */}
              <div className="flex justify-center gap-3 mb-8">
                {(Object.keys(TIER_COLORS) as Tier[]).map(tier => {
                  const t = TIER_COLORS[tier];
                  return (
                    <button
                      key={tier}
                      onClick={() => setActiveTier(tier)}
                      className={`px-5 py-2 rounded-full text-sm font-bold border transition-all ${
                        activeTier === tier
                          ? `${t.bg} ${t.border} ${t.text} scale-105`
                          : 'border-white/10 text-gray-500 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Pricing table grouped by zone */}
              <div className="space-y-8">
                {Object.entries(byZone).sort(([a],[b]) => +a - +b).map(([zone, items]) => (
                  <div key={zone}>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-arrow-gray mb-3 pl-1">
                      {ZONE_LABELS[+zone] ?? `Zone ${zone}`}
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-arrow-deepGreen/40">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-arrow-dark border-b border-arrow-deepGreen/30">
                            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Wilaya</th>
                            <th className="text-center py-3 px-4 font-semibold">
                              <span className={tc.text}>Domicile</span>
                            </th>
                            <th className="text-center py-3 px-4 font-semibold">
                              <span className={tc.text}>Stop-Desk</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx % 2 === 0 ? 'bg-neutral-950/50' : ''}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} className="text-arrow-green shrink-0" />
                                  <span className="text-white font-medium">{item.city}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-white font-bold text-base">
                                  {item[`${activeTier}_domicile` as keyof typeof item]?.toLocaleString()}
                                </span>
                                <span className="text-arrow-green text-xs ml-1">DA</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-white font-bold text-base">
                                  {item[`${activeTier}_stop` as keyof typeof item]?.toLocaleString()}
                                </span>
                                <span className="text-arrow-green text-xs ml-1">DA</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {filteredPricing.length === 0 && (
                <p className="text-center text-gray-500 mt-10">No wilayas found.</p>
              )}

              <div className="mt-10 bg-gradient-to-r from-arrow-deepGreen to-neutral-900 rounded-2xl p-8 text-center border border-arrow-green/30">
                <h3 className="text-2xl font-bold text-white mb-2">Retour / Return Fee</h3>
                <p className="text-arrow-green text-3xl font-extrabold">50 DA <span className="text-base text-gray-300 font-normal">flat</span></p>
              </div>
            </div>
          )}

          {/* ── DESKS TAB ── */}
          {activeTab === 'desks' && (
            <div className="space-y-8 animate-fade-in">
              <p className="text-center text-arrow-gray text-sm mb-4">
                <span className="text-arrow-green font-bold">102 bureaux</span> across Algeria
              </p>
              {filteredDesks.map((item, idx) => (
                <div key={idx} className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl overflow-hidden">
                  <div className="bg-neutral-900/50 px-6 py-4 border-b border-arrow-deepGreen/30">
                    <h3 className="text-xl font-bold text-arrow-green flex items-center gap-2">
                      <MapPin size={20} /> {item.wilaya}
                      <span className="ml-auto text-xs text-gray-500 font-normal">{item.stations.length} bureau{item.stations.length > 1 ? 'x' : ''}</span>
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {item.stations.map((station, sIdx) => (
                      <div key={sIdx} className="bg-neutral-950 p-5 rounded-xl border border-white/5 hover:border-arrow-green/50 transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex items-start gap-3 mb-3">
                            <Building className="text-gray-500 shrink-0 mt-1" size={16} />
                            <h4 className="font-semibold text-white">{station.name}</h4>
                          </div>
                          <p className="text-sm text-gray-400 ml-7 mb-4 leading-relaxed">{station.address}</p>
                        </div>
                        <div className="space-y-3">
                          {station.phone && (
                            <div className="flex items-center gap-3 ml-7 text-arrow-green text-sm font-medium bg-arrow-deepGreen/10 py-2 px-3 rounded-lg w-fit">
                              <Phone size={14} />
                              {station.phone}
                            </div>
                          )}
                          {(station.mapsUrl || station.maps_url) && (
                            <a
                              href={station.mapsUrl || station.maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 ml-7 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            >
                              <ExternalLink size={14} /> View on Maps
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredDesks.length === 0 && (
                <p className="text-center text-gray-500 mt-10">No bureaux found.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Pricing;