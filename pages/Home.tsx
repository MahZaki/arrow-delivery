import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { 
  ArrowRight, 
  Truck, 
  Clock, 
  ShieldCheck, 
  ArrowUp, 
  Phone, 
  Globe, 
  Check, 
  Star, 
  CheckCircle, 
  Smartphone, 
  MapPin, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Calculator,
  RefreshCw,
  Send,
  MessageSquare
} from 'lucide-react';

const translations = {
  fr: {
    announcement: "⚡ Expédition Express sur 58 Wilayas | Virement de vos fonds sous 48h maximum",
    heroBadge: "★ Le partenaire de confiance pour l'e-commerce en Algérie",
    heroTitle: "Expédiez en toute confiance. Récupérez vos fonds rapidement.",
    heroSubtitle: "Arrow Delivery simplifie la logistique de votre boutique en ligne. Nous livrons vos clients sur 58 wilayas et sécurisons vos encaissements COD.",
    trackPlaceholder: "Entrez le code de suivi (ex: ECERHF...)",
    trackBtn: "Suivre",
    startBtn: "Créer un compte",
    contactBtn: "Parler sur WhatsApp",
    statsWilayas: "58 Wilayas",
    statsWilayasDesc: "Couverture nationale totale",
    statsSpeed: "24h - 48h",
    statsSpeedDesc: "Temps de livraison moyen",
    statsCOD: "COD Sécurisé",
    statsCODDesc: "Virement rapide garanti",
    statsRate: "99%",
    statsRateDesc: "Taux de satisfaction client",
    servicesTitle: "Nos Solutions Logistiques",
    servicesSubtitle: "Un service de livraison sur-mesure pour booster vos ventes en Algérie",
    serviceDomName: "Livraison à Domicile",
    serviceDomDesc: "Nous livrons vos clients directement chez eux dans les 58 wilayas avec soin.",
    serviceStopName: "Stop-Desk / Point Relais",
    serviceStopDesc: "Vos clients récupèrent leurs colis dans l'un de nos bureaux partenaires.",
    servicePickupName: "Ramassage Gratuit",
    servicePickupDesc: "Nous collectons gratuitement vos colis chez vous dès 10 expéditions.",
    serviceCodName: "Recouvrement COD garanti",
    serviceCodDesc: "Collecte rigoureuse du cash et virement direct sur votre compte CCP/Bancaire.",
    serviceTrackName: "Suivi en Temps Réel",
    serviceTrackDesc: "Une transparence totale avec un tracking précis de chaque étape du colis.",
    serviceReturnName: "Gestion des Retours",
    serviceReturnDesc: "Traitement rapide des échanges et retours avec frais réduits à 50 DA.",
    howItWorksTitle: "Comment ça fonctionne ?",
    howItWorksSubtitle: "Une intégration simple en 3 étapes pour automatiser vos expéditions",
    step1Title: "1. Créez votre envoi",
    step1Desc: "Enregistrez vos commandes sur notre plateforme ou via notre API Ecotrack.",
    step2Title: "2. Nous récupérons les colis",
    step2Desc: "Nos livreurs passent collecter vos colis directement dans votre entrepôt.",
    step3Title: "3. Livraison & Virement",
    step3Desc: "Nous livrons vos clients et transférons vos gains COD en toute sécurité.",
    calcTitle: "Calculateur de Tarifs Interactif",
    calcSubtitle: "Estimez instantanément le coût de votre expédition",
    selectWilaya: "Sélectionnez une Wilaya",
    deliveryType: "Type de Livraison",
    homeDelivery: "🏠 Domicile",
    stopDesk: "🏪 Stop-Desk (Bureau)",
    calcResult: "Tarif estimé",
    calcWarning: "Tarif indicatif basé sur le pack standard.",
    testimonialsTitle: "Ils nous font confiance",
    testimonialsSubtitle: "Découvrez les retours d'expérience de nos e-commerçants partenaires",
    faqTitle: "Foire Aux Questions",
    faqSubtitle: "Tout ce que vous devez savoir sur nos services de livraison",
    faqQ1: "Quels sont les délais de virement de l'argent du COD ?",
    faqA1: "Nous traitons vos virements COD de manière hebdomadaire ou bimensuelle dès encaissement. Vos fonds sont versés directement sur votre compte CCP ou bancaire.",
    faqQ2: "Comment fonctionne le ramassage des colis ?",
    faqA2: "Le ramassage est totalement gratuit à partir de 10 colis. Vous pouvez planifier une collecte directement depuis votre espace marchand.",
    faqQ3: "Que se passe-t-il en cas de colis refusé ?",
    faqA3: "En cas de refus du client, le colis est retourné à notre dépôt central. Les frais de retour sont fixes à 50 DA par colis.",
    faqQ4: "Proposez-vous une API pour automatiser les commandes ?",
    faqA4: "Oui, notre système est entièrement compatible avec l'API Ecotrack. Vous pouvez connecter votre boutique Shopify, WooCommerce ou site personnalisé en quelques minutes.",
    downloadTitle: "Gérez vos colis partout avec l'App Mobile",
    downloadSubtitle: "Téléchargez notre application mobile pour suivre vos ventes, colis et paiements en temps réel.",
    footerText: "Arrow Delivery - Solution de livraison express et logistique pour l'e-commerce en Algérie.",
    langSwitch: "العربية",
  },
  ar: {
    announcement: "⚡ شحن سريع إلى 58 ولاية | تحويل أموال الدفع عند الاستلام خلال 48 ساعة كحد أقصى",
    heroBadge: "★ الشريك الموثوق للتجارة الإلكترونية في الجزائر",
    heroTitle: "اشحن بكل ثقة. استرجع أموالك بسرعة وأمان.",
    heroSubtitle: "تسهّل أرو دليفري الخدمات اللوجستية لمتجرك الإلكتروني. نوصّل لزبائنك في 58 ولاية ونضمن تحصيل مبالغ الدفع عند الاستلام.",
    trackPlaceholder: "أدخل رقم التتبع (مثال: ...ECERHF)",
    trackBtn: "تتبع",
    startBtn: "إنشاء حساب مجاني",
    contactBtn: "تواصل عبر واتساب",
    statsWilayas: "58 ولاية",
    statsWilayasDesc: "تغطية وطنية شاملة لكافة المناطق",
    statsSpeed: "24 - 48 ساعة",
    statsSpeedDesc: "متوسط وقت التوصيل لزبائنك",
    statsCOD: "دفع آمن عند الاستلام",
    statsCODDesc: "تحويل سريع ومضمون لأموالك",
    statsRate: "99%",
    statsRateDesc: "معدل رضا العملاء والتوصيل الناجح",
    servicesTitle: "حلولنا اللوجستية",
    servicesSubtitle: "خدمة توصيل مصممة خصيصاً لزيادة مبيعاتك في الجزائر",
    serviceDomName: "التوصيل للمنزل",
    serviceDomDesc: "نوصّل طلبيات زبائنك مباشرة إلى باب منزلهم في جميع أنحاء الجزائر بكل عناية.",
    serviceStopName: "الاستلام من المكتب (Stop-Desk)",
    serviceStopDesc: "يمكن لزبائنك استلام طرودهم من أقرب مكتب شريك في ولايتهم لتوفير التكاليف.",
    servicePickupName: "جمع الطرود مجاناً",
    servicePickupDesc: "نقوم بجمع طرودك مجانًا من مقرك أو مستودعك ابتداءً من 10 طرود.",
    serviceCodName: "تحصيل مالي آمن (COD)",
    serviceCodDesc: "تحصيل دقيق للمبالغ المالية وتحويلها مباشرة لحسابك الجاري CCP أو البنكي.",
    serviceTrackName: "تتبع فوري في الوقت الفعلي",
    serviceTrackDesc: "شفافية مطلقة مع تتبع دقيق لكل مرحلة يمر بها طردك من الشحن للتسليم.",
    serviceReturnName: "إدارة الإرجاع والتبديل",
    serviceReturnDesc: "معالجة سريعة لطلبات التبديل والإرجاع مع رسوم ثابتة تقدر بـ 50 دج فقط.",
    howItWorksTitle: "كيف نعمل ؟",
    howItWorksSubtitle: "خطوات بسيطة لأتمتة عمليات الشحن والتوصيل لمتجرك",
    step1Title: "1. أنشئ طلبيتك",
    step1Desc: "سجّل طلبياتك بسهولة عبر منصتنا أو اربط متجرك مباشرة باستخدام واجهة API.",
    step2Title: "2. نجمع طرودك",
    step2Desc: "يتنقل أعواننا إليك لجمع الطرود مباشرة من منزلك أو مستودعك مجاناً.",
    step3Title: "3. التوصيل والدفع",
    step3Desc: "نقوم بتوصيل الطرود للزبائن وتحويل مستحقاتك المالية بأمان وسرعة.",
    calcTitle: "حاسبة أسعار التوصيل",
    calcSubtitle: "احسب تكلفة شحن طردك فورياً وبكل سهولة",
    selectWilaya: "اختر الولاية",
    deliveryType: "نوع التوصيل",
    homeDelivery: "🏠 للمنزل",
    stopDesk: "🏪 من المكتب",
    calcResult: "السعر المقدر",
    calcWarning: "السعر تقديري مبني على التعريفة القياسية.",
    testimonialsTitle: "شركاء النجاح",
    testimonialsSubtitle: "آراء بعض التجار وأصحاب المتاجر الإلكترونية المتعاملين معنا",
    faqTitle: "الأسئلة الشائعة",
    faqSubtitle: "كل ما تود معرفته عن خدمات التوصيل وحلول الدفع لدينا",
    faqQ1: "ما هي مدة تحويل أموال الدفع عند الاستلام (COD) ؟",
    faqA1: "نقوم بمعالجة وتحويل مستحقاتك المالية بشكل دوري وسريع مباشرة لحسابك الجاري CCP أو البنكي فور تحصيلها من الزبائن.",
    faqQ2: "كيف يمكنني طلب جمع الطرود من مقري ؟",
    faqA2: "خدمة جمع الطرود مجانية تماماً ابتداءً من 10 طرود. يمكنك جدولة عملية الجمع بسهولة من خلال لوحة التحكم الخاصة بك.",
    faqQ3: "ما هي تكلفة الطرود المرتجعة (المرجوعة) ؟",
    faqA3: "في حال رفض الزبون استلام الطرد، يتم إرجاعه لمستودعنا. الرسوم المفروضة على المرتجعات ثابتة وهي 50 دج فقط للوصول.",
    faqQ4: "هل توفرون واجهة برمجة تطبيقات (API) لربط المتاجر ؟",
    faqA4: "نعم، نظامنا متوافق بالكامل مع واجهة برمجة تطبيقات Ecotrack. يمكنك ربط متجرك على شوبيفاي، ووكومرس أو أي منصة أخرى في دقائق معدودة.",
    downloadTitle: "تطبيق الهاتف لإدارة طرودك أينما كنت",
    downloadSubtitle: "حمّل تطبيقنا المخصص للتجار لمتابعة المبيعات، حالة الطرود والمدفوعات المالية مباشرة من هاتفك.",
    footerText: "أرو دليفري - الحل الأمثل للتوصيل السريع والخدمات اللوجستية للتجارة الإلكترونية في الجزائر.",
    langSwitch: "Français",
  }
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { pricing } = useData();
  
  // State for Language (default: fr)
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  
  // State for Tracking Number input
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // State for interactive calculator
  const [selectedCity, setSelectedCity] = useState('Alger');
  const [deliveryType, setDeliveryType] = useState<'domicile' | 'stop'>('domicile');
  
  // State for FAQ accordions
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({
    0: true, // first open by default
  });

  const t = translations[lang];
  const isRtl = lang === 'ar';

  const toggleLanguage = () => {
    setLang(prev => prev === 'fr' ? 'ar' : 'fr');
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/track?code=${encodeURIComponent(trackingNumber.trim())}`);
    }
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Find pricing item based on selected city
  const currentPricing = pricing.find(p => p.city.toLowerCase() === selectedCity.toLowerCase()) || pricing[0];
  
  const estimatedPrice = currentPricing 
    ? (deliveryType === 'domicile' 
        ? (currentPricing.silver_domicile ?? currentPricing.domicile ?? 450)
        : (currentPricing.silver_stop ?? currentPricing.stop ?? 250))
    : 450;

  return (
    <div className={`relative flex flex-col min-h-screen ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Announcement Bar */}
      <div className="bg-[#2FBF8E] text-black py-2.5 px-4 text-center text-xs md:text-sm font-extrabold tracking-wide z-20 shadow-md">
        <span className="inline-flex items-center gap-2">
          {t.announcement}
        </span>
      </div>

      {/* Floating Language Switcher Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 bg-neutral-900/90 border border-[#2FBF8E] text-[#2FBF8E] font-bold text-xs md:text-sm px-4 py-3 rounded-full hover:bg-[#2FBF8E] hover:text-black transition-all shadow-[0_0_15px_rgba(47,191,142,0.4)] backdrop-blur-md"
        >
          <Globe size={14} />
          {t.langSwitch}
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative bg-arrow-black overflow-hidden py-16 lg:py-28 border-b border-neutral-900">
        
        {/* Animated Background effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-0 ${isRtl ? 'left-0' : 'right-0'} w-1/2 h-full bg-gradient-to-l from-arrow-deepGreen/10 to-transparent`}></div>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-arrow-green/5 rounded-full blur-3xl"></div>
          
          {/* Flying Arrows decoration */}
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute text-arrow-green/20 animate-shoot"
              style={{
                left: `${Math.random() * 100 - 10}%`,
                bottom: '-100px',
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
                opacity: 0.3 + Math.random() * 0.5
              }}
            >
              <ArrowUp className="w-4 h-4 md:w-6 md:h-6" strokeWidth={2} />
            </div>
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Side: Headline & Form */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-arrow-green/30 bg-arrow-green/10 text-arrow-green text-xs md:text-sm font-semibold tracking-wide uppercase self-start animate-pulse-fast">
                {t.heroBadge}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                {t.heroTitle.split('.').map((part, index) => (
                  <span key={index} className={index === 1 ? "text-transparent bg-clip-text bg-gradient-to-r from-arrow-green to-emerald-400" : ""}>
                    {part}{index === 0 && '.'}
                  </span>
                ))}
              </h1>
              <p className="text-lg md:text-xl text-arrow-gray mb-8 max-w-xl leading-relaxed">
                {t.heroSubtitle}
              </p>

              {/* Tracking input box directly inside Hero for convenience */}
              <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mb-8">
                <input 
                  type="text" 
                  placeholder={t.trackPlaceholder}
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className={`flex-grow bg-neutral-900 border border-arrow-deepGreen/60 text-white rounded-xl px-5 py-4 focus:border-arrow-green focus:shadow-[0_0_15px_rgba(47,191,142,0.2)] focus:outline-none transition-all ${isRtl ? 'text-right' : 'text-left'}`}
                />
                <button 
                  type="submit" 
                  className="px-6 py-4 bg-gradient-to-r from-arrow-green to-arrow-deepGreen text-black font-extrabold rounded-xl hover:shadow-[0_0_20px_rgba(47,191,142,0.5)] transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                >
                  <span>{t.trackBtn}</span>
                  <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />
                </button>
              </form>

              {/* Main CTAs */}
              <div className="flex flex-wrap gap-4 items-center">
                <button 
                  onClick={() => navigate('/login')}
                  className="px-8 py-4 bg-white text-black font-extrabold rounded-xl hover:bg-gray-100 hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {t.startBtn}
                </button>
                
                <a 
                  href="https://wa.me/213561623525" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-neutral-900/80 border border-arrow-deepGreen text-arrow-green font-bold rounded-xl hover:bg-arrow-deepGreen/10 transition-all flex items-center gap-2"
                >
                  <MessageSquare size={18} className="text-arrow-green animate-bounce" />
                  {t.contactBtn}
                </a>
              </div>
            </div>

            {/* Right Side: Interactive Mockup Card / Live Simulator */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-arrow-green/10 rounded-3xl blur-3xl pointer-events-none"></div>
              
              <div className="relative bg-neutral-900 border border-arrow-deepGreen/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
                
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-arrow-green font-mono">arrow-delivery.dz/live</span>
                </div>

                {/* Dashboard Stats Preview */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-arrow-black p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-arrow-gray uppercase tracking-wider mb-1">COD Recouvré</p>
                    <p className="text-xl md:text-2xl font-black text-arrow-green">148,600 DA</p>
                  </div>
                  <div className="bg-arrow-black p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-arrow-gray uppercase tracking-wider mb-1">Taux de Livraison</p>
                    <p className="text-xl md:text-2xl font-black text-arrow-green">94.8%</p>
                  </div>
                </div>

                {/* Simulated Shipment Status Timeline */}
                <div className="space-y-4">
                  <div className="bg-arrow-black/50 p-4 rounded-2xl border border-arrow-green/20 relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-arrow-green font-mono">#ECVJ26042510</span>
                        <h4 className="text-sm font-bold text-white mt-1">Client: Amel Cosmetics</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-arrow-green/20 text-arrow-green">
                        LIVRÉ & ARCHIVÉ
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-arrow-gray mt-2 pt-2 border-t border-white/5">
                      <span>Net Recouvré: <strong className="text-white">6,400 DA</strong></span>
                      <span>Wilaya: <strong className="text-white">Oran</strong></span>
                    </div>
                  </div>

                  <div className="bg-arrow-black/50 p-4 rounded-2xl border border-white/5 relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-arrow-gray font-mono">#ECVJ26042518</span>
                        <h4 className="text-sm font-bold text-white mt-1">Client: SmartShop Dz</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-500">
                        EN LIVRAISON
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-arrow-gray mt-2 pt-2 border-t border-white/5">
                      <span>Montant: <strong className="text-white">8,900 DA</strong></span>
                      <span>Wilaya: <strong className="text-white">Constantine</strong></span>
                    </div>
                  </div>
                </div>

                {/* Trust Badge at the bottom of Right Card */}
                <div className="mt-6 flex items-center justify-between text-xs text-arrow-gray pt-4 border-t border-white/5">
                  <span className="flex items-center gap-1.5 text-arrow-green font-bold">
                    <ShieldCheck size={14} /> Recouvrement 100% garanti
                  </span>
                  <span>Mise à jour: instantanée</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section Banner */}
      <section className="bg-neutral-900 border-b border-neutral-800 py-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-arrow-green/10 rounded-full flex items-center justify-center mb-3">
                <Globe className="text-arrow-green" size={24} />
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-1 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">{t.statsWilayas}</h3>
              <p className="text-xs md:text-sm text-arrow-gray">{t.statsWilayasDesc}</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-arrow-green/10 rounded-full flex items-center justify-center mb-3">
                <Clock className="text-arrow-green" size={24} />
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-1 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">{t.statsSpeed}</h3>
              <p className="text-xs md:text-sm text-arrow-gray">{t.statsSpeedDesc}</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-arrow-green/10 rounded-full flex items-center justify-center mb-3">
                <ShieldCheck className="text-arrow-green" size={24} />
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-1 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">{t.statsCOD}</h3>
              <p className="text-xs md:text-sm text-arrow-gray">{t.statsCODDesc}</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-arrow-green/10 rounded-full flex items-center justify-center mb-3">
                <Star className="text-arrow-green fill-arrow-green" size={24} />
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-1 drop-shadow-[0_0_10px_rgba(47,191,142,0.3)]">{t.statsRate}</h3>
              <p className="text-xs md:text-sm text-arrow-gray">{t.statsRateDesc}</p>
            </div>

          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="py-20 bg-arrow-black relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              {t.servicesTitle}
            </h2>
            <p className="text-lg text-arrow-gray max-w-2xl mx-auto">
              {t.servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Domicile */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl hover:border-arrow-green transition-all duration-300 group hover:shadow-[0_0_25px_rgba(47,191,142,0.1)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-arrow-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-all duration-300">
                  <Truck className="text-arrow-green group-hover:text-black transition-all duration-300" size={30} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-arrow-green transition-all duration-300">{t.serviceDomName}</h3>
                <p className="text-arrow-gray leading-relaxed mb-6">{t.serviceDomDesc}</p>
              </div>
              <span className="text-arrow-green text-sm font-bold flex items-center gap-1">58 Wilayas <Check size={16} /></span>
            </div>

            {/* Card 2: Stop-Desk */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl hover:border-arrow-green transition-all duration-300 group hover:shadow-[0_0_25px_rgba(47,191,142,0.1)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-arrow-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-all duration-300">
                  <MapPin className="text-arrow-green group-hover:text-black transition-all duration-300" size={30} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-arrow-green transition-all duration-300">{t.serviceStopName}</h3>
                <p className="text-arrow-gray leading-relaxed mb-6">{t.serviceStopDesc}</p>
              </div>
              <span className="text-arrow-green text-sm font-bold flex items-center gap-1">102 Bureaux <Check size={16} /></span>
            </div>

            {/* Card 3: Ramassage */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl hover:border-arrow-green transition-all duration-300 group hover:shadow-[0_0_25px_rgba(47,191,142,0.1)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-arrow-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-all duration-300">
                  <Send className="text-arrow-green group-hover:text-black transition-all duration-300" size={30} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-arrow-green transition-all duration-300">{t.servicePickupName}</h3>
                <p className="text-arrow-gray leading-relaxed mb-6">{t.servicePickupDesc}</p>
              </div>
              <span className="text-arrow-green text-sm font-bold flex items-center gap-1">Gratuit <Check size={16} /></span>
            </div>

            {/* Card 4: Recouvrement COD */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl hover:border-arrow-green transition-all duration-300 group hover:shadow-[0_0_25px_rgba(47,191,142,0.1)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-arrow-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-all duration-300">
                  <ShieldCheck className="text-arrow-green group-hover:text-black transition-all duration-300" size={30} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-arrow-green transition-all duration-300">{t.serviceCodName}</h3>
                <p className="text-arrow-gray leading-relaxed mb-6">{t.serviceCodDesc}</p>
              </div>
              <span className="text-arrow-green text-sm font-bold flex items-center gap-1">Virement sous 48h <Check size={16} /></span>
            </div>

            {/* Card 5: Suivi */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl hover:border-arrow-green transition-all duration-300 group hover:shadow-[0_0_25px_rgba(47,191,142,0.1)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-arrow-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-all duration-300">
                  <RefreshCw className="text-arrow-green group-hover:text-black transition-all duration-300 font-bold" size={30} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-arrow-green transition-all duration-300">{t.serviceTrackName}</h3>
                <p className="text-arrow-gray leading-relaxed mb-6">{t.serviceTrackDesc}</p>
              </div>
              <span className="text-arrow-green text-sm font-bold flex items-center gap-1">Temps réel <Check size={16} /></span>
            </div>

            {/* Card 6: Retours */}
            <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl hover:border-arrow-green transition-all duration-300 group hover:shadow-[0_0_25px_rgba(47,191,142,0.1)] flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-arrow-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-arrow-green transition-all duration-300">
                  <ArrowRight className="text-arrow-green group-hover:text-black transition-all duration-300" size={30} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-arrow-green transition-all duration-300">{t.serviceReturnName}</h3>
                <p className="text-arrow-gray leading-relaxed mb-6">{t.serviceReturnDesc}</p>
              </div>
              <span className="text-arrow-green text-sm font-bold flex items-center gap-1">Frais fixes: 50 DA <Check size={16} /></span>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive Shipping Calculator Widget */}
      <section className="py-20 bg-neutral-900 border-t border-b border-neutral-800 relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-arrow-green/10 mb-4">
              <Calculator className="text-arrow-green" size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">{t.calcTitle}</h2>
            <p className="text-arrow-gray">{t.calcSubtitle}</p>
          </div>

          <div className="bg-arrow-black rounded-3xl p-8 border border-arrow-deepGreen/30 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* Input Controls */}
            <div className="space-y-6">
              
              {/* City Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">{t.selectWilaya}</label>
                <select 
                  value={selectedCity} 
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-neutral-900 border border-arrow-deepGreen/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-arrow-green"
                >
                  {pricing.map((p, idx) => (
                    <option key={idx} value={p.city}>{p.city}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Type Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">{t.deliveryType}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button" 
                    onClick={() => setDeliveryType('domicile')}
                    className={`py-3 px-4 rounded-xl font-bold border transition-all ${deliveryType === 'domicile' ? 'bg-arrow-green text-black border-transparent shadow-lg' : 'bg-neutral-900 text-gray-400 border-white/5 hover:text-white'}`}
                  >
                    {t.homeDelivery}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setDeliveryType('stop')}
                    className={`py-3 px-4 rounded-xl font-bold border transition-all ${deliveryType === 'stop' ? 'bg-arrow-green text-black border-transparent shadow-lg' : 'bg-neutral-900 text-gray-400 border-white/5 hover:text-white'}`}
                  >
                    {t.stopDesk}
                  </button>
                </div>
              </div>

            </div>

            {/* Output Display Card */}
            <div className="bg-gradient-to-br from-neutral-900 to-arrow-black border border-white/5 p-6 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-arrow-green/5 rounded-full blur-2xl"></div>
              
              <span className="text-xs uppercase tracking-wider text-arrow-gray font-bold">{t.calcResult}</span>
              
              <div className="my-6">
                <span className="text-5xl md:text-6xl font-black text-arrow-green drop-shadow-[0_0_15px_rgba(47,191,142,0.4)]">
                  {estimatedPrice}
                </span>
                <span className="text-xl text-white font-extrabold ml-2">DA</span>
              </div>

              <div className="text-xs text-arrow-gray pt-4 border-t border-white/5 mt-4">
                {t.calcWarning}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-arrow-black relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t.howItWorksTitle}</h2>
            <p className="text-lg text-arrow-gray max-w-2xl mx-auto">{t.howItWorksSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            
            <div className="bg-neutral-900 p-8 rounded-2xl border border-white/5 relative hover:border-arrow-green transition-all duration-300">
              <span className="absolute -top-6 left-6 text-7xl font-black text-arrow-green/20">01</span>
              <h3 className="text-xl font-extrabold text-white mb-4 pt-4">{t.step1Title}</h3>
              <p className="text-arrow-gray leading-relaxed">{t.step1Desc}</p>
            </div>

            <div className="bg-neutral-900 p-8 rounded-2xl border border-white/5 relative hover:border-arrow-green transition-all duration-300">
              <span className="absolute -top-6 left-6 text-7xl font-black text-arrow-green/20">02</span>
              <h3 className="text-xl font-extrabold text-white mb-4 pt-4">{t.step2Title}</h3>
              <p className="text-arrow-gray leading-relaxed">{t.step2Desc}</p>
            </div>

            <div className="bg-neutral-900 p-8 rounded-2xl border border-white/5 relative hover:border-arrow-green transition-all duration-300">
              <span className="absolute -top-6 left-6 text-7xl font-black text-arrow-green/20">03</span>
              <h3 className="text-xl font-extrabold text-white mb-4 pt-4">{t.step3Title}</h3>
              <p className="text-arrow-gray leading-relaxed">{t.step3Desc}</p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-neutral-900/50 border-t border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t.testimonialsTitle}</h2>
            <p className="text-lg text-arrow-gray max-w-2xl mx-auto">{t.testimonialsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Testimonial 1 */}
            <div className="bg-arrow-black p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-yellow-500 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-yellow-500" />)}
                </div>
                <p className="text-gray-300 italic leading-relaxed mb-6">
                  "Depuis que j'ai rejoint Arrow Delivery, mon taux de livraison a augmenté de 30%. Le suivi en temps réel me permet de rassurer mes clients et le virement hebdomadaire me simplifie la gestion."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-arrow-green flex items-center justify-center font-bold text-black">AB</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Amine B.</h4>
                  <span className="text-xs text-arrow-gray">Boutique de Mode, Alger</span>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-arrow-black p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-yellow-500 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-yellow-500" />)}
                </div>
                <p className="text-gray-300 italic leading-relaxed mb-6">
                  "Le ramassage gratuit à domicile a tout changé pour moi. Plus besoin de me déplacer à l'agence. L'équipe est réactive et le stop-desk dans ma wilaya facilite la vie de mes clients."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-arrow-green flex items-center justify-center font-bold text-black">RK</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Rania K.</h4>
                  <span className="text-xs text-arrow-gray">Cosmétiques Naturels, Oran</span>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-arrow-black p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-yellow-500 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-yellow-500" />)}
                </div>
                <p className="text-gray-300 italic leading-relaxed mb-6">
                  "Avec plus de 200 envois par jour, j'avais besoin d'un partenaire fiable. Arrow Delivery gère tout : le ramassage, la livraison, les retours et le recouvrement. L'API est excellente."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-arrow-green flex items-center justify-center font-bold text-black">KM</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Karim M.</h4>
                  <span className="text-xs text-arrow-gray">Électronique & Accessoires, Sétif</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="py-20 bg-arrow-black relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{t.faqTitle}</h2>
            <p className="text-lg text-arrow-gray max-w-2xl mx-auto">{t.faqSubtitle}</p>
          </div>

          <div className="space-y-4">
            
            {/* FAQ 1 */}
            <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => toggleFaq(0)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-white hover:text-arrow-green focus:outline-none"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="text-arrow-green" size={20} />
                  {t.faqQ1}
                </span>
                {faqOpen[0] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {faqOpen[0] && (
                <div className="px-6 pb-5 text-arrow-gray text-sm md:text-base leading-relaxed border-t border-white/5 pt-3">
                  {t.faqA1}
                </div>
              )}
            </div>

            {/* FAQ 2 */}
            <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => toggleFaq(1)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-white hover:text-arrow-green focus:outline-none"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="text-arrow-green" size={20} />
                  {t.faqQ2}
                </span>
                {faqOpen[1] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {faqOpen[1] && (
                <div className="px-6 pb-5 text-arrow-gray text-sm md:text-base leading-relaxed border-t border-white/5 pt-3">
                  {t.faqA2}
                </div>
              )}
            </div>

            {/* FAQ 3 */}
            <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => toggleFaq(2)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-white hover:text-arrow-green focus:outline-none"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="text-arrow-green" size={20} />
                  {t.faqQ3}
                </span>
                {faqOpen[2] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {faqOpen[2] && (
                <div className="px-6 pb-5 text-arrow-gray text-sm md:text-base leading-relaxed border-t border-white/5 pt-3">
                  {t.faqA3}
                </div>
              )}
            </div>

            {/* FAQ 4 */}
            <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => toggleFaq(3)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-white hover:text-arrow-green focus:outline-none"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="text-arrow-green" size={20} />
                  {t.faqQ4}
                </span>
                {faqOpen[3] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {faqOpen[3] && (
                <div className="px-6 pb-5 text-arrow-gray text-sm md:text-base leading-relaxed border-t border-white/5 pt-3">
                  {t.faqA4}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-20 bg-neutral-900 border-t border-neutral-800 overflow-hidden relative">
        <div className="absolute inset-0 bg-arrow-green/5 rounded-full blur-3xl -right-40 -top-40 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
                {t.downloadTitle}
              </h2>
              <p className="text-lg text-arrow-gray mb-8 max-w-xl leading-relaxed">
                {t.downloadSubtitle}
              </p>
              
              {/* Store buttons */}
              <div className="flex flex-wrap gap-4">
                <a href="#playstore" className="flex items-center gap-3 bg-arrow-black border border-white/10 px-6 py-3 rounded-xl hover:border-arrow-green transition-all hover:bg-neutral-950">
                  <Smartphone size={24} className="text-arrow-green" />
                  <div className="text-left">
                    <span className="text-[10px] text-arrow-gray block">GET IT ON</span>
                    <span className="text-sm font-bold text-white">Google Play</span>
                  </div>
                </a>

                <a href="#appstore" className="flex items-center gap-3 bg-arrow-black border border-white/10 px-6 py-3 rounded-xl hover:border-arrow-green transition-all hover:bg-neutral-950">
                  <Smartphone size={24} className="text-arrow-green" />
                  <div className="text-left">
                    <span className="text-[10px] text-arrow-gray block">Download on the</span>
                    <span className="text-sm font-bold text-white">App Store</span>
                  </div>
                </a>

                <a href="#appgallery" className="flex items-center gap-3 bg-arrow-black border border-white/10 px-6 py-3 rounded-xl hover:border-arrow-green transition-all hover:bg-neutral-950">
                  <Smartphone size={24} className="text-arrow-green" />
                  <div className="text-left">
                    <span className="text-[10px] text-arrow-gray block">Explore it on</span>
                    <span className="text-sm font-bold text-white">AppGallery</span>
                  </div>
                </a>
              </div>
            </div>

            {/* App Mockup Visual */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-72 h-[500px] bg-neutral-950 rounded-[40px] border-8 border-neutral-800 shadow-2xl p-4 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-20"></div>
                <div className="bg-arrow-black h-full w-full rounded-[24px] p-4 flex flex-col justify-between text-left relative overflow-hidden">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-4">
                    <span className="text-xs font-bold text-arrow-green">Arrow Delivery</span>
                    <span className="w-2 h-2 rounded-full bg-arrow-green animate-ping"></span>
                  </div>
                  
                  {/* Mock content */}
                  <div className="space-y-4 flex-grow">
                    <div className="bg-neutral-900 p-3 rounded-xl">
                      <span className="text-[10px] text-arrow-gray block">SOLDE ACTUEL</span>
                      <span className="text-lg font-black text-white">24,500 DA</span>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-[10px] text-arrow-gray font-bold block">COLIS RÉCENTS</span>
                      <div className="bg-neutral-900 p-2.5 rounded-xl border-l-2 border-arrow-green flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">#ECVJ26042510</span>
                          <span className="text-[10px] text-arrow-gray">Livre - Alger</span>
                        </div>
                        <span className="text-arrow-green font-bold">+450 DA</span>
                      </div>
                      <div className="bg-neutral-900 p-2.5 rounded-xl border-l-2 border-yellow-500 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">#ECVJ26042518</span>
                          <span className="text-[10px] text-arrow-gray">En Transit - Oran</span>
                        </div>
                        <span className="text-yellow-500 font-bold">Encours</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] text-center text-arrow-gray">© 2026 Arrow Delivery Inc.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer / Legal Trust Banner */}
      <section className="bg-arrow-black py-8 border-t border-neutral-900 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-arrow-gray">
          <p>{t.footerText}</p>
          <div className="flex gap-4">
            <a href="#cgu" className="hover:text-arrow-green transition-all">CGU</a>
            <span>•</span>
            <a href="#privacy" className="hover:text-arrow-green transition-all">Confidentialité</a>
            <span>•</span>
            <a href="#support" className="hover:text-arrow-green transition-all">Support client 6j/7</a>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;