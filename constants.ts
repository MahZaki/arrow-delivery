
import { PricingItem, DeskItem, DeskStation } from './types';

export const API_URL = 'https://imir.ecotrack.dz';
export const API_TOKEN = 'qyW7zYNUhC5ssqT6VNpfSMOSlFkwzYaNVA02rha2sPPtpasV9KiRgO1qw52D';

// Tracking numbers for archived orders that are excluded from the main list API.
// We explicitly hardcode these in the service to avoid fetch errors.
export const ARCHIVED_TRACKING_NUMBERS = [
  'ECVJDJ260108303581',
  'ECVJDJ260108303582',
  'ECVJDJ260108303585',
  'ECVJDJ260108303588',
  'ECVJDJ260108303589',
  'ECVJDJ260108303590',
  'ECVJDJ260108303593',
  'ECVJDJ260108303599',
  'ECVJDJ260108303600-EXCH',
  'ECVJDJ260108303602-EXCH',
  'ECVJDJ260108303603',
  'ECVJDJ260108303607',
  'ECVJDJ260108303609',
  'ECVJDJ260108303611',
  'ECVJDJ260108303619',
  'ECVJDJ260110306591',
  'ECVJDJ260110306594',
  'ECVJDJ260110306596',
  'ECVJDJ260110306600',
  'ECVJDJ260110306602',
  'ECVJDJ260110306604-EXCH',
  'ECVJDJ260110306612',
  'ECVJDJ260110306613',
  'ECVJDJ260110306615',
  'ECVJDJ260110306621',
  'ECVJDJ260110306622',
  'ECVJDJ260110306629-EXCH',
  'ECVJDJ260110306637',
  'ECVJDJ260110306640',
  'ECVJDJ260110306642',
  'ECVJDJ260110306644',
  'ECVJDJ260110306645',
  'ECVJDJ260110306646',
  'ECVJDJ260110306647',
  'ECVJDJ260110306649'
];

export const STATUS_TRANSLATIONS: Record<string, string> = {
  'order_information_received_by_carrier': 'Order Registered',
  'prete_a_expedier': 'Ready to Ship',
  'prête_à_expédier': 'Ready to Ship',
  'en_preparation_stock': 'Stock Preparation',
  'picked': 'Picked Up',
  'en_ramassage': 'Being Collected',
  'vers_hub': 'To Hub',
  'en_hub': 'At Hub',
  'accepted_by_carrier': 'Received at Hub',
  'vers_wilaya': 'To Destination',
  'en_preparation': 'In Preparation',
  'dispatched_to_driver': 'Out for Delivery',
  'en_livraison': 'Out for Delivery',
  'attempt_delivery': 'Delivery Attempt',
  'suspendu': 'Suspended',
  'livre_non_encaisse': 'Delivered - Not Collected',
  'livré_non_encaissé': 'Delivered - Not Collected',
  'livred': 'Delivered',
  'livré': 'Delivered',
  'encaisse_non_paye': 'Collected - Not Paid',
  'encaissé_non_payé': 'Collected - Not Paid',
  'encaissed': 'Payment Collected',
  'encaissé': 'Payment Collected',
  'paiements_prets': 'Payment Ready',
  'paiements_prêts': 'Payment Ready',
  'payed': 'Payment Completed',
  'payé': 'Payment Completed',
  'paye_et_archive': 'Paid & Archived',
  'payé_et_archivé': 'Paid & Archived',
  'return_asked': 'Return Initiated',
  'retour_chez_livreur': 'Return with Driver',
  'return_in_transit': 'Return in Transit',
  'retour_transit_entrepot': 'Return to Warehouse',
  'retour_en_traitement': 'Return Processing',
  'Return_received': 'Return Received',
  'retour_recu': 'Return Received',
  'retour_reçu': 'Return Received',
  'retour_archive': 'Return Archived',
  'retour_archivé': 'Return Archived',
  'annule': 'Cancelled',
  'annulé': 'Cancelled',
  'notification_on_order': 'Order Updated'
};

export const WILAYAS: Record<string, string> = {
  '1': 'Adrar', '2': 'Chlef', '3': 'Laghouat', '4': 'Oum El Bouaghi', '5': 'Batna',
  '6': 'Béjaïa', '7': 'Biskra', '8': 'Béchar', '9': 'Blida', '10': 'Bouira',
  '11': 'Tamanrasset', '12': 'Tébessa', '13': 'Tlemcen', '14': 'Tiaret', '15': 'Tizi Ouzou',
  '16': 'Alger', '17': 'Djelfa', '18': 'Jijel', '19': 'Sétif', '20': 'Saïda',
  '21': 'Skikda', '22': 'Sidi Bel Abbès', '23': 'Annaba', '24': 'Guelma', '25': 'Constantine',
  '26': 'Médéa', '27': 'Mostaganem', '28': "M'Sila", '29': 'Mascara', '30': 'Ouargla',
  '31': 'Oran', '32': 'El Bayadh', '33': 'Illizi', '34': 'Bordj Bou Arréridj', '35': 'Boumerdès',
  '36': 'El Tarf', '37': 'Tindouf', '38': 'Tissemsilt', '39': 'El Oued', '40': 'Khenchela',
  '41': 'Souk Ahras', '42': 'Tipaza', '43': 'Mila', '44': 'Aïn Defla', '45': 'Naâma',
  '46': 'Aïn Témouchent', '47': 'Ghardaïa', '48': 'Relizane', '49': "El M'Ghair", '50': 'El Meniaa',
  '51': 'Ouled Djellal', '52': 'Bordj Baji Mokhtar', '53': 'Béni Abbès', '54': 'Timimoun',
  '55': 'Touggourt', '56': 'Djanet', '57': 'In Salah', '58': 'In Guezzam'
};

export const PRICING_DATA: PricingItem[] = [
    { city: "Alger", domicile: 400, stop: 250 },
    { city: "Blida", domicile: 550, stop: 350 },
    { city: "Boumerdes", domicile: 550, stop: 350 },
    { city: "Tipaza", domicile: 550, stop: 350 },
    { city: "Ain Defla", domicile: 750, stop: 400 },
    { city: "Ain Temouchent", domicile: 750, stop: 450 },
    { city: "Annaba", domicile: 750, stop: 400 },
    { city: "Batna", domicile: 750, stop: 400 },
    { city: "Bejaia", domicile: 750, stop: 400 },
    { city: "Bordj Bou Arreridj", domicile: 750, stop: 400 },
    { city: "Bouira", domicile: 700, stop: 400 },
    { city: "Chlef", domicile: 700, stop: 400 },
    { city: "Constantine", domicile: 700, stop: 400 },
    { city: "El Tarf", domicile: 700, stop: 400 },
    { city: "Guelma", domicile: 750, stop: 400 },
    { city: "Jijel", domicile: 750, stop: 400 },
    { city: "Khenchela", domicile: 750, stop: 400 },
    { city: "Mascara", domicile: 750, stop: 400 },
    { city: "Medea", domicile: 750, stop: 400 },
    { city: "Mila", domicile: 750, stop: 400 },
    { city: "Mostaganem", domicile: 750, stop: 400 },
    { city: "Msila", domicile: 750, stop: 400 },
    { city: "Oran", domicile: 650, stop: 400 },
    { city: "Oum El Bouaghi", domicile: 750, stop: 400 },
    { city: "Relizane", domicile: 750, stop: 400 },
    { city: "Saida", domicile: 780, stop: 400 },
    { city: "Setif", domicile: 700, stop: 400 },
    { city: "Sidi Bel Abbes", domicile: 750, stop: 400 },
    { city: "Skikda", domicile: 750, stop: 400 },
    { city: "Souk Ahras", domicile: 750, stop: 400 },
    { city: "Tiaret", domicile: 750, stop: 400 },
    { city: "Tissemsilt", domicile: 750, stop: 400 },
    { city: "Tizi Ouzou", domicile: 650, stop: 400 },
    { city: "Tlemcen", domicile: 750, stop: 400 },
    { city: "Biskra", domicile: 850, stop: 400 },
    { city: "Djelfa", domicile: 850, stop: 400 },
    { city: "El Oued", domicile: 850, stop: 550 },
    { city: "Ghardaia", domicile: 880, stop: 500 },
    { city: "Laghouat", domicile: 880, stop: 500 },
    { city: "Ouargla", domicile: 850, stop: 550 },
    { city: "Tebessa", domicile: 800, stop: 450 },
    { city: "El Bayadh", domicile: 850, stop: 650 },
    { city: "Naama", domicile: 850, stop: 650 },
    { city: "Bechar", domicile: 950, stop: 600 },
    { city: "Adrar", domicile: 1150, stop: 850 },
    { city: "Tindouf", domicile: 1300, stop: 900 },
    { city: "Illizi", domicile: 1450, stop: 900 },
    { city: "Tamanrasset", domicile: 1400, stop: 900 },
    { city: "Timimoun", domicile: 1200, stop: 900 }
];

const DESKS_RAW = [
    { wilaya: "Chlef", name: "Station Chlef", address: "حي البساتين", phone: "0658380800 / 0770896097", mapsUrl: "https://maps.app.goo.gl/LyGTgtB9MsRgxUv19" },
    { wilaya: "Laghouat", name: "Station Laghouat", address: "حي المحافير مقابل الباب الخلفي لجامعة بيولوجي", phone: "0670717957 / 0661953925", mapsUrl: "https://maps.app.goo.gl/iCRzkawR7h3V9wgm9" },
    { wilaya: "Oum El Bouaghi", name: "Station Oum El Bouaghi", address: "بالقرب من عيادة نوميديا سيفاكس", phone: "0542104530", mapsUrl: "https://maps.app.goo.gl/mB8H1iRriRVZRcVk6?g_st=awb" },
    { wilaya: "Batna", name: "Station Batna", address: "en face la grande poste & CPA", phone: "0771420592", mapsUrl: "https://maps.app.goo.gl/cRL2T1xdDc8GCWiG9" },
    { wilaya: "Béjaïa", name: "Station Béjaïa", address: "34 rue Kamel laadjouz derrière prison Lakhmisse", phone: "0770322865", mapsUrl: "https://maps.app.goo.gl/4fEUY39ppiG1CaDw7" },
    { wilaya: "Biskra", name: "Station Biskra", address: "حي العالية 300 مسكن بجنب الأمن الحضري السابع", phone: "0770317195", mapsUrl: "https://maps.app.goo.gl/VTxeBkJHKugGq2wp7" },
    { wilaya: "Blida", name: "Station Blida", address: "24 شارع بلقاسم الوزري – أمام مقر المحكمة بالبليدة – لاري كوشا", phone: "0550905228 / 0550905195 / 0550455886", mapsUrl: "https://maps.app.goo.gl/Yp978dm15YV1Q3Da9" },
    { wilaya: "Blida", name: "Station Bouinan", address: "Cité khayliya à côté de clinique", phone: "0791154416 / 0784076503", mapsUrl: "https://maps.app.goo.gl/u32181VCMngJ11Q49" },
    { wilaya: "Bouira", name: "Station Bouira", address: "Cité Ammar khoudja route Ain tork, a 200 m de bureau yaliddine", phone: "0661582229", mapsUrl: "https://maps.app.goo.gl/7ub9VhixTDAbLE4B6" },
    { wilaya: "Tébessa", name: "Station Tébessa", address: "حي باتيجاك تبسة", phone: "0696003441", mapsUrl: "https://maps.app.goo.gl/GBGr3y49mXFtGBKu8?g_st=aw" },
    { wilaya: "Tlemcen", name: "Station Tlemcen", address: "حي بن حمودة بجانب مسجد خالد ابن الوليد", phone: "0655667174", mapsUrl: "https://maps.app.goo.gl/2QEyN3jKrtsd6PCJ8" },
    { wilaya: "Tiaret", name: "Station Tiaret", address: "حي المنظر الجميل (volani) بالضبط فوق 8eme أمام الجمعية", phone: "0657487526 / 0672460716", mapsUrl: "https://maps.app.goo.gl/Vg6MCuqH4Jz6Lw3V7" },
    { wilaya: "Tizi Ouzou", name: "Station Tizi Ouzou", address: "Cité 5 juillet BAT 1 Local 9 15000", phone: "0770552045", mapsUrl: "https://maps.app.goo.gl/ULmFVSjrvVdhEuun7" },
    { wilaya: "Alger", name: "Station Beaulieu", address: "Hai ali khodja N129A Beaulieu Oued Smar", phone: "0555353929", mapsUrl: "https://maps.app.goo.gl/XpcuysEiY5e1jgqU7" },
    { wilaya: "Alger", name: "Station Ain Naadja", address: "حي النسيم، مقابل مركز الشرطة فلوريست", phone: "0781602698", mapsUrl: "https://maps.app.goo.gl/78XEB7s7s4CWLgPZ6" },
    { wilaya: "Alger", name: "Station Ouled Fayet", address: "أولاد فايت قرب اتصالات بلقاسمي", phone: "0549589272", mapsUrl: "https://maps.app.goo.gl/oe4MiJuNiYDc4rbp6" },
    { wilaya: "Alger", name: "Station Birkhadem", address: "Résidence el Affak, Birkhadem", phone: "0556038678", mapsUrl: "https://maps.app.goo.gl/NAdaiSQzHZVDP1uQ8" },
    { wilaya: "Alger", name: "Station Les Eucalyptus", address: "حي 406 مسكن المحل رقم 13 E07 الكاليتوس", phone: "0555317558", mapsUrl: "https://maps.app.goo.gl/7KfpZDu2XKZcHoAc8" },
    { wilaya: "Alger", name: "Station Alger Centre", address: "12 Rue Mohamed CHOUDER, Sidi M'Hamed 16000", phone: "0552551911 / 0776456711", mapsUrl: "https://maps.app.goo.gl/JVLACeJezN1ujpPx6" },
    { wilaya: "Alger", name: "Station Cheraga", address: "Cheraga mosqué soufi", phone: "0549791011", mapsUrl: "https://maps.app.goo.gl/SfMaz9YMWjYzB1Dd6?g_st=ipc" },
    { wilaya: "Alger", name: "Station Hamiz", address: "RTE HAMIZ BEK", phone: "0549874825 / 0781990466", mapsUrl: "https://maps.app.goo.gl/9dDFbd7unVWqQTU66" },
    { wilaya: "Alger", name: "Station Bordj El Bahri", address: "187 lotissement Nord-Est 1639 Bordj el bahri Alger", phone: "0549874825 / 0781990466", mapsUrl: "https://maps.app.goo.gl/gQKXnERrDj8LUjSA8" },
    { wilaya: "Djelfa", name: "Station Djelfa", address: "حي الوأم مقابل محل بيع العتاد الفلاحي محور دوران", phone: "0655597172 / 0660569097", mapsUrl: "https://maps.app.goo.gl/gZ3fzfiVjGjFADGs6" },
    { wilaya: "Jijel", name: "Station Jijel", address: "Lotissement bourmel 04 Rue lounis Mustapha jijel", phone: "0699212417 / 0772560175", mapsUrl: "https://maps.app.goo.gl/t3zmcRNsSF452z4L7" },
    { wilaya: "Sétif", name: "Station Sétif", address: "أولاد براهم مقابل ثانوية الحرائق باب دخول التلاميذ", phone: "0699212417 / 0772560175", mapsUrl: "https://maps.app.goo.gl/zJAYKhwYG1zvVyNj9" },
    { wilaya: "Saïda", name: "Station Saïda", address: "تجزئة 05 جويلية رقم 50 أ محل رقم 1 بلدي السعيدة", phone: "0776274663", mapsUrl: "https://maps.app.goo.gl/Ly32CafhmjoYF6bd8" },
    { wilaya: "Skikda", name: "Station Skikda", address: "حي مرج الديب مقابل مديرية التكوين المهني", phone: "0799834205 / 0770660486", mapsUrl: "https://maps.app.goo.gl/uUD8TAUzToT9di2D8" },
    { wilaya: "Sidi Bel Abbès", name: "Station Sidi Bel Abbès", address: "حي بن حمودة بجانب مسجد خالد ابن الوليد", phone: "0784790178", mapsUrl: "https://maps.app.goo.gl/4ZPU2jstkSwHBfGM6" },
    { wilaya: "Annaba", name: "Station Annaba", address: "Taher ben Achour، Rue Colonel Amirouche، N° 05 Lots B, Annaba", phone: "0660988623", mapsUrl: "https://maps.app.goo.gl/th9yLacBJh9WR6NA8" },
    { wilaya: "Annaba", name: "Station Annaba 2", address: "Centre d'innovation, El Bouni (+2 points de relais)", phone: "0660988623", mapsUrl: "https://maps.app.goo.gl/A6F48Cyy7GtrAxf69" },
    { wilaya: "Constantine", name: "Station Constantine", address: "UV 02 projet de 265 logement participatif bt 02 n° 11 ali mendjli, prêt de la CAAT assurance", phone: "0776144470 / 0773639602", mapsUrl: "https://maps.app.goo.gl/erZdw2fzjopGGoCU6" },
    { wilaya: "Médéa", name: "Station Médéa", address: "bazar fatoumi, Rte d'Alger, Médéa 26000", phone: "0770209477", mapsUrl: "https://maps.app.goo.gl/TbwJUU3MWzr73Vnm8" },
    { wilaya: "Mostaganem", name: "Station Mostaganem", address: "شمومة، مقابل الإقامة الجامعية 2200، شير هواري بومدين", phone: "0663308597 / 0797170097", mapsUrl: "https://maps.app.goo.gl/muckSAHTrs2W7g7W8" },
    { wilaya: "M'Sila", name: "Station M'Sila", address: "شارع دبي خلف عمارات سونلغاز -طريق دار الشباب-", phone: "0661942162", mapsUrl: "https://maps.app.goo.gl/muEFbct4geCqKxww5" },
    { wilaya: "Mascara", name: "Station Mascara", address: "العنوان شارع مهور محي الدين طريق الرمان مقابل القطاع العملياتي العسكري بمحاذاة مدرسة العقيد", phone: "0795408343", mapsUrl: "https://maps.app.goo.gl/1Tg33eCmhsfT8bcq9" },
    { wilaya: "Ouargla", name: "Station Ouargla", address: "مخادمة، أمام مقبرة سيدي منصور", phone: "0660454199", mapsUrl: "https://maps.app.goo.gl/VmeM3xMfptGPuoHFA" },
    { wilaya: "Oran", name: "Station Oran", address: "1500 logements, batiment 508, local n° 35 usto, commune bir el jir", phone: "0770413185", mapsUrl: "https://maps.app.goo.gl/Lcy536PVgV8fjNoY8" },
    { wilaya: "Bordj Bou Arreridj", name: "Station Bordj Bou Arreridj", address: "Rue B6 Bordj Bou Arreridj", phone: "0770334718", mapsUrl: "https://maps.app.goo.gl/fzf2TYSZZeUPVbnE7?g_st=aw" },
    { wilaya: "Boumerdès", name: "Station Boumerdès", address: "حي النسيم 11 ديسيمبر 1960 ، محل رقم 25 أ", phone: "0555787733", mapsUrl: "https://maps.app.goo.gl/SSrkCpept7kLqdU46?g_st=ac" },
    { wilaya: "Tissemsilt", name: "Station Tissemsilt", address: "مقابل قاعة متعددة الرياضات عين البرج", phone: "0656911066", mapsUrl: "https://maps.app.goo.gl/BVbKu5KqFPHny7R27" },
    { wilaya: "El Oued", name: "Station El Oued", address: "حي محمد خميستي الوادي الجدلة", phone: "0672585241", mapsUrl: "https://maps.app.goo.gl/2o7n2MYKZYyQU2bH7" },
    { wilaya: "Khenchela", name: "Station Khenchela", address: "تجزئة 5 جويلية قطة رقم 127 رقم القسم المساحي 107 مجموعة ملكية 08 محل رقم 01 بلدية خنشلة", phone: "0781678449 / 0662820121", mapsUrl: "https://maps.app.goo.gl/J4N3LMTWL2GfGtA1A" },
    { wilaya: "Souk Ahras", name: "Station Souk Ahras", address: "حي الفيبور نهج ورتي عبد الرحمان مقابل المرشي الفوقاني", phone: "0550396588", mapsUrl: "https://maps.app.goo.gl/FsERXT7nu3BAE2Xc8" },
    { wilaya: "Tipaza", name: "Station Tipaza", address: "حي 20+50 مسكن تساهمي, عمارة رقم اربعة, فوق الملعب البلدي", phone: "0542286681", mapsUrl: "https://maps.app.goo.gl/vK3J3YvcDpN5Uv8f7" },
    { wilaya: "Mila", name: "Station Mila", address: "شارع عيسى صايف، حي قض الماء، قرب المحكمة والمجموعة الولائية للدرك الوطني", phone: "0797729155", mapsUrl: "https://maps.app.goo.gl/ZYsAa3ryQkosfeeK6" },
    { wilaya: "Aïn Defla", name: "Station Aïn Defla", address: "حي خياط محمد فوق فندق ناجم", phone: "0676519825", mapsUrl: "https://maps.app.goo.gl/VEnLz92w3jsedttB8" },
    { wilaya: "Aïn Defla", name: "Station Khemis Miliana", address: "شارع حلايمي محمد خميس مليانة عين الدفلة", phone: "0792661720 / 0563078611", mapsUrl: "https://maps.app.goo.gl/SbhDQLoAgTNuzoRT8?g_st=ipc" },
    { wilaya: "Aïn Témouchent", name: "Station Aïn Témouchent", address: "Cité 300 logements Tounsi ain Temouchent", phone: "0774890047", mapsUrl: "https://maps.app.goo.gl/ikStB7YMqWJfSxtY6" },
    { wilaya: "Relizane", name: "Station Relizane", address: "شارع بن عرب، وادي مهيدي، أرزيو", phone: "0770422732 / 0667378782", mapsUrl: "https://maps.app.goo.gl/YF41H4kGTcREiPxh7" },
    { wilaya: "Touggourt", name: "Station Touggourt", address: "حي محمد خميستي 22 سكن رقم 14", phone: "0697138992", mapsUrl: "https://maps.app.goo.gl/iSfedR8Lq2XbP6uy7" },
];

// Organize desks by Wilaya
const organizedDesks: DeskItem[] = [];
const wilayaMap = new Map<string, DeskStation[]>();

DESKS_RAW.forEach(d => {
    if (!wilayaMap.has(d.wilaya)) {
        wilayaMap.set(d.wilaya, []);
    }
    // Include mapsUrl in the object
    wilayaMap.get(d.wilaya)?.push({ wilaya: d.wilaya, name: d.name, address: d.address, phone: d.phone, mapsUrl: d.mapsUrl });
});

wilayaMap.forEach((stations, wilaya) => {
    organizedDesks.push({ wilaya, stations });
});

// Sort alphabetically
organizedDesks.sort((a, b) => a.wilaya.localeCompare(b.wilaya));

export const DESK_DATA = organizedDesks;
