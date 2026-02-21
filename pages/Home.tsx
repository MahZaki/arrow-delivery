import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Clock, ShieldCheck, ArrowUp } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-arrow-black overflow-hidden py-20 lg:py-32">
        {/* Animated Arrows Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-arrow-deepGreen/20 to-transparent"></div>
             <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-arrow-green/10 rounded-full blur-3xl"></div>
             
             {/* Flying Arrows - Increased visibility and count for the 'series' vibe */}
             {[...Array(20)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute text-arrow-green/40 animate-shoot drop-shadow-[0_0_8px_rgba(47,191,142,0.6)]"
                    style={{
                        left: `${Math.random() * 100 - 20}%`, // Start anywhere from -20% to 80% left to cover screen diagonally
                        bottom: '-100px', // Start just below the view
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${2.5 + Math.random() * 3}s`, // Varying speeds
                        opacity: 0.4 + Math.random() * 0.6 // Varying opacity
                    }}
                >
                    <ArrowUp className="w-4 h-4 md:w-8 md:h-8" strokeWidth={2.5} />
                </div>
             ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-arrow-green/30 bg-arrow-green/10 text-arrow-green text-sm font-semibold tracking-wide uppercase animate-pulse-fast">
                Logistics Redefined
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight relative drop-shadow-2xl">
                Swift as an <span className="text-transparent bg-clip-text bg-gradient-to-r from-arrow-green to-emerald-600">Arrow</span>.
            </h1>
            <p className="text-xl text-arrow-gray mb-10 max-w-2xl mx-auto leading-relaxed">
                Reliable delivery solutions tailored for speed and precision. Track your packages in real-time and manage your logistics with our advanced dashboard.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/track" className="px-8 py-4 bg-gradient-to-r from-arrow-green to-arrow-deepGreen text-arrow-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(47,191,142,0.6)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 border border-transparent hover:border-arrow-green/50">
                    Track Your Order <ArrowRight size={20} />
                </Link>
                <Link to="/pricing" className="px-8 py-4 bg-neutral-900/50 border border-arrow-deepGreen text-arrow-green font-bold rounded-xl hover:bg-arrow-deepGreen/20 transition-all flex items-center justify-center backdrop-blur-sm">
                    Check Pricing
                </Link>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-neutral-900 border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-arrow-black p-8 rounded-2xl border border-neutral-800 hover:border-arrow-green/50 transition-all group hover:shadow-[0_0_20px_rgba(30,111,74,0.2)]">
                      <div className="w-14 h-14 bg-neutral-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-colors duration-300">
                          <Truck className="text-arrow-green group-hover:text-black transition-colors duration-300" size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-arrow-green transition-colors">Nationwide Coverage</h3>
                      <p className="text-neutral-400">Reaching every corner of the 58 Wilayas with our extensive logistics network.</p>
                  </div>
                  <div className="bg-arrow-black p-8 rounded-2xl border border-neutral-800 hover:border-arrow-green/50 transition-all group hover:shadow-[0_0_20px_rgba(30,111,74,0.2)]">
                      <div className="w-14 h-14 bg-neutral-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-colors duration-300">
                          <Clock className="text-arrow-green group-hover:text-black transition-colors duration-300" size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-arrow-green transition-colors">Real-Time Tracking</h3>
                      <p className="text-neutral-400">Monitor your package's journey from pickup to delivery with live updates.</p>
                  </div>
                  <div className="bg-arrow-black p-8 rounded-2xl border border-neutral-800 hover:border-arrow-green/50 transition-all group hover:shadow-[0_0_20px_rgba(30,111,74,0.2)]">
                      <div className="w-14 h-14 bg-neutral-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-colors duration-300">
                          <ShieldCheck className="text-arrow-green group-hover:text-black transition-colors duration-300" size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-arrow-green transition-colors">Secure Handling</h3>
                      <p className="text-neutral-400">Your items are insured and handled with the utmost care by professionals.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-arrow-black relative overflow-hidden">
          <div className="absolute -right-20 top-20 w-80 h-80 bg-arrow-green/5 rounded-full blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-4">
              <div className="bg-gradient-to-r from-arrow-dark to-neutral-900 rounded-3xl p-12 border border-arrow-deepGreen/30 relative shadow-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                      <div>
                          <div className="text-4xl md:text-5xl font-bold text-arrow-green mb-2 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">58</div>
                          <div className="text-neutral-400 uppercase tracking-wider text-sm">Wilayas Covered</div>
                      </div>
                      <div>
                          <div className="text-4xl md:text-5xl font-bold text-arrow-green mb-2 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">24h</div>
                          <div className="text-neutral-400 uppercase tracking-wider text-sm">Fast Dispatch</div>
                      </div>
                      <div>
                          <div className="text-4xl md:text-5xl font-bold text-arrow-green mb-2 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">10k+</div>
                          <div className="text-neutral-400 uppercase tracking-wider text-sm">Happy Clients</div>
                      </div>
                      <div>
                          <div className="text-4xl md:text-5xl font-bold text-arrow-green mb-2 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">99%</div>
                          <div className="text-neutral-400 uppercase tracking-wider text-sm">Success Rate</div>
                      </div>
                  </div>
              </div>
          </div>
      </section>
    </div>
  );
};

export default Home;