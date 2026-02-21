import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Search, MapPin, Building, Phone, ExternalLink } from 'lucide-react';

const Pricing: React.FC = () => {
  const { pricing, desks, loadingData } = useData();
  const [activeTab, setActiveTab] = useState<'pricing' | 'desks'>('pricing');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering Logic
  const filteredPricing = pricing.filter(item => 
    item.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDesks = desks.filter(item => 
    item.wilaya.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.stations.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-arrow-green to-arrow-deepGreen bg-clip-text text-transparent mb-4">
                Pricing & Locations
            </h1>
            <p className="text-arrow-gray">Transparent delivery rates and our network of pickup stations.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
            <div className="bg-arrow-dark border border-arrow-deepGreen rounded-xl p-1 inline-flex">
                <button 
                    onClick={() => { setActiveTab('pricing'); setSearchTerm(''); }}
                    className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'pricing' 
                        ? 'bg-arrow-green text-black shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Delivery Rates
                </button>
                <button 
                    onClick={() => { setActiveTab('desks'); setSearchTerm(''); }}
                    className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'desks' 
                        ? 'bg-arrow-green text-black shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Desk Stations
                </button>
            </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-10 relative">
            <Search className="absolute left-4 top-4 text-arrow-green" size={20} />
            <input 
                type="text" 
                placeholder={activeTab === 'pricing' ? "Search for your city..." : "Search for a Wilaya or Station..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-arrow-dark border border-arrow-deepGreen text-white pl-12 pr-6 py-4 rounded-xl focus:border-arrow-green focus:shadow-[0_0_15px_rgba(47,191,142,0.2)] focus:outline-none transition-all"
            />
        </div>

        {loadingData ? (
            <div className="text-center py-20 text-arrow-green animate-pulse">Loading data...</div>
        ) : (
            <>
                {/* Content - Pricing */}
                {activeTab === 'pricing' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredPricing.map((item, idx) => (
                                <div key={idx} className="bg-arrow-dark border border-arrow-deepGreen/50 rounded-2xl p-6 hover:border-arrow-green hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin className="text-arrow-green" size={20} />
                                        <h3 className="text-xl font-bold text-white group-hover:text-arrow-green transition-colors">{item.city}</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-gray-400 text-sm">Domicile</span>
                                            <span className="text-xl font-bold text-white">{item.domicile} <span className="text-xs text-arrow-green">DA</span></span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-gray-400 text-sm">Stop Desk</span>
                                            <span className="text-xl font-bold text-white">{item.stop} <span className="text-xs text-arrow-green">DA</span></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredPricing.length === 0 && (
                            <p className="text-center text-gray-500 mt-10">No cities found.</p>
                        )}
                        
                        <div className="mt-12 bg-gradient-to-r from-arrow-deepGreen to-neutral-900 rounded-2xl p-8 text-center border border-arrow-green/30">
                            <h3 className="text-2xl font-bold text-white mb-2">Return Policy</h3>
                            <p className="text-arrow-green text-3xl font-extrabold">50 DA <span className="text-base text-gray-300 font-normal">Flat Return Fee</span></p>
                        </div>
                    </div>
                )}

                {/* Content - Desks */}
                {activeTab === 'desks' && (
                    <div className="space-y-8 animate-fade-in">
                        {filteredDesks.map((item, idx) => (
                            <div key={idx} className="bg-arrow-dark border border-arrow-deepGreen rounded-2xl overflow-hidden">
                                <div className="bg-neutral-900/50 px-6 py-4 border-b border-arrow-deepGreen/30">
                                    <h3 className="text-xl font-bold text-arrow-green flex items-center gap-2">
                                        <MapPin size={20} /> {item.wilaya}
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
                                                <div className="flex items-center gap-3 ml-7 text-arrow-green text-sm font-medium bg-arrow-deepGreen/10 py-2 px-3 rounded-lg w-fit">
                                                    <Phone size={14} />
                                                    {station.phone}
                                                </div>
                                                {station.mapsUrl && (
                                                    <a 
                                                        href={station.mapsUrl} 
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
                            <p className="text-center text-gray-500 mt-10">No stations found.</p>
                        )}
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default Pricing;