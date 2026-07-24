---
name: algeria-cod-landing
description: >
  Build high-converting landing pages for Cash on Delivery (COD / paiement à la livraison) delivery companies
  operating in Algeria. Use this skill whenever a user asks to create a landing page, site vitrine, one-pager,
  or marketing page for an Algerian delivery or e-logistics company — or for any e-commerce business in Algeria
  that relies on COD. Trigger on keywords like: livraison algérie, COD algérie, landing page livraison, page
  de vente algérie, sociéte de livraison, e-commerce algérien, شركة توصيل الجزائر, توصيل بالدفع عند الاستلام.
  This skill outputs complete, production-ready HTML/CSS/JS landing pages that reflect Algerian market realities:
  COD-first trust signals, Arabic/French bilingual support, wilaya coverage maps, mobile-first design, and
  conversion patterns proven in the local market. Always use this skill before writing any delivery landing page
  code so the output is tailored to Algerian users — not a generic Western SaaS template.
---

# Algeria COD Delivery Landing Page Skill

This skill produces **high-converting**, **market-accurate** landing pages for Algerian delivery/e-logistics
companies operating on a Cash on Delivery model. It is grounded in deep research of the top players:
Yalidine, Maystro, NOEST Express, ZR Express, and Zimou Express.

---

## Step 0 — Read the Frontend Design Skill First

Before writing any code, read `/mnt/skills/public/frontend-design/SKILL.md` for aesthetic guidelines.
Apply those principles here: bold typography, contextual color, motion, and no generic AI aesthetics.

---

## Step 1 — Understand the Context

Gather from the user (or infer from context):

| Question | Why it matters |
|----------|---------------|
| Company name & tagline | Hero text, brand tone |
| Target audience | Merchants (B2B) vs end-consumers (B2C)? |
| Key services | Livraison domicile, stop-desk, stockage, dropshipping, COD recouvrement |
| Language(s) | French, Arabic (Darija/MSA), or bilingual |
| Wilayas covered | Number (55/58) vs specific zones |
| Unique selling point | Speed (24h), price, real-time tracking, app, pickup gratuit |
| CTA goal | Sign-up / inscription, contact sales, download app, get quote |
| Brand colors (if any) | Otherwise choose from market palette below |

If details are missing, proceed with strong defaults from the market research below and note your assumptions.

---

## Step 2 — Market Intelligence (Algeria COD Ecosystem)

### The Algerian Delivery Market — Key Facts

- **COD dominates**: Cash on Delivery is the overwhelmingly preferred payment method in Algeria. Every major
  carrier leads with "paiement à la livraison" or "recouvrement" as a primary service.
- **National coverage language**: Companies signal trust by stating wilaya count (55, 58). "58 wilayas" = full
  national coverage and is a key trust signal.
- **Two delivery modes**: *Livraison à domicile* (home delivery) and *Stop-desk / Point relais* (pick-up at
  agency). Always mention both.
- **Speed expectation**: 24h for northern wilayas, 48h for southern wilayas. State this explicitly.
- **Mobile-first audience**: Algerian e-commerce sellers and buyers are predominantly on mobile (Android).
  Landing pages must be fully responsive.
- **Bilingual market**: Most companies publish in French + Arabic. Darija-style Arabic resonates with local
  sellers on Facebook/Instagram shops.
- **Free pickup is a hook**: Several players (Zimou, Maystro) offer free parcel pickup from the merchant.
  This is a strong conversion hook.
- **Real-time tracking**: A required feature signal — Algerian merchants experienced fraud/loss and demand
  trackability.
- **App download CTA**: All major companies have a merchant mobile app (Android priority, Huawei AppGallery
  secondary). App store badges are expected.

### Competitive Landscape Snapshot

| Company | Founded | Coverage | Differentiators |
|---------|---------|----------|----------------|
| **Yalidine** | 2013 | 55 wilayas | Market pioneer, ISO 9001/14001/45001 certified, B2B+B2C, fastest brand recognition |
| **Maystro** | ~2019 | 50 wilayas, 2 countries | Warehousing, packaging, call center, 75% delivered <24h, 5K+ stores |
| **NOEST Express** | 2018 | 55 wilayas, 73 stop-desks | Jumia partner, document delivery specialist, 6/7 customer service |
| **ZR Express** | ~2015 | 58 wilayas | 7/7 delivery including Fridays, competitive pricing |
| **Zimou Express** | ~2020 | 58 wilayas | Multi-carrier aggregator, dropshipping, Zimou School (free training), ERP |

### What the Top Landing Pages Do Right

1. **Bold hero headline** stating the core promise in 5–8 words (speed + coverage + reliability)
2. **Key stats strip** immediately below hero: number of wilayas, delivery time, number of merchants/clients
3. **Services grid** with icons: Livraison domicile, Stop-desk, Ramassage, Stockage, Recouvrement COD, Suivi
4. **Social proof section**: client logos carousel, testimonials from real merchants (nominate "e-commerçant")
5. **Coverage map / wilaya list** — visual credibility
6. **Pricing teaser** + CTA ("Contactez notre équipe commerciale" or "Inscrivez-vous gratuitement")
7. **App download section** with Apple + Google Play + Huawei badges
8. **Trust badges**: certifications (ISO), years in business, number of deliveries
9. **Contact + WhatsApp CTA** — WhatsApp is the primary B2B communication channel in Algeria
10. **Sticky header** with "Se connecter" and "Créer un compte / Inscription" CTAs

### What Doesn't Work (Avoid)

- Generic Western SaaS design (blue/white, Stripe-style, Inter font) — feels foreign, reduces trust
- English-only copy — use French as primary, Arabic as secondary or bilingual toggle
- No COD mention — if COD isn't prominent, Algerian merchants assume it's not supported
- Only a contact form — local merchants prefer WhatsApp link, phone number, or direct CTA
- No wilaya count — vague "national coverage" is not credible without a number

---

## Step 3 — Landing Page Structure Blueprint

Build in this section order for maximum conversion:

```
[NAVBAR]        Logo | Nav links | "Se connecter" | "Inscription" CTA

[HERO]          Headline (bold claim) + subheadline (COD + coverage + speed)
                Primary CTA: "Commencer gratuitement" or "Demander un devis"
                Hero visual: delivery guy / package / map of Algeria

[STATS BAR]     [58 Wilayas] [+10 000 Expéditeurs] [24h Livraison] [99% Taux de livraison]

[SERVICES]      Icon grid — 6–8 services with short descriptions

[HOW IT WORKS]  3-step process: 1. Créez votre commande  2. On ramasse  3. On livre & vous payez

[SOCIAL PROOF]  Client logos strip + 2–3 merchant testimonials

[COVERAGE]      Algeria map graphic or wilaya badge grid

[PRICING]       2–3 tiers or "tarifs transparents" + CTA to contact sales

[APP DOWNLOAD]  Mobile app section with store badges

[TRUST SIGNALS] ISO certs, years of experience, partner logos

[CONTACT / CTA] WhatsApp button + phone + email + sign-up form

[FOOTER]        Links, social media, legal
```

---

## Step 4 — Design & Aesthetic Direction

### Color Palette Options

Choose one palette based on brand positioning:

**Option A — "Confiance & Vitesse" (Blue/Orange)** — like Yalidine/Maystro
- Primary: `#0A2463` (deep navy — trust, logistics)
- Accent: `#E63946` or `#FF6B35` (speed/urgency orange-red)
- Light: `#F0F4FF`

**Option B — "Moderne & Tech" (Dark/Green)** — premium feel
- Primary: `#0D1B2A`
- Accent: `#2EC4B6` (teal)
- Highlight: `#FFBF00`

**Option C — "Algerian Energy" (Green/White/Red)** — patriotic, local trust
- Primary: `#006233` (Algerian green)
- Accent: `#C8102E`
- Neutral: `#F5F5F0`

### Typography
- **Display font**: Clash Display, Syne, or Rajdhani (bold, modern logistics feel)
- **Body**: Plus Jakarta Sans or Nunito (readable, warm, works in FR/AR)
- **Arabic**: Noto Sans Arabic or Cairo (Google Fonts, free)

### Visual Language
- Rounded corners on cards (8–12px)
- Subtle map/route lines as background decoration
- Package/box icons (not arrows/chevrons)
- Algeria silhouette as a graphic element

---

## Step 5 — Copy Templates (French)

### Hero Headlines
- "La livraison la plus rapide dans les **58 wilayas**"
- "Livrez vos colis en **24h** avec paiement à la livraison"
- "Votre partenaire logistique pour l'**e-commerce algérien**"
- "Développez votre business. On s'occupe de la livraison."

### Subheadlines
- "Ramassage gratuit · Suivi en temps réel · Recouvrement COD sécurisé"
- "Plus de [X] e-commerçants nous font confiance partout en Algérie"

### CTAs
- Primary: "Commencer maintenant" / "Inscription gratuite" / "Créer mon compte"
- Secondary: "Calculer mes tarifs" / "Parler à un conseiller"
- WhatsApp: "Contacter sur WhatsApp"

### Stats (customize numbers)
- Wilayas couvertes: 55 / 58
- Délai livraison nord: 24h
- Délai livraison sud: 48h
- Taux de livraison: 95%+
- Nombre de marchands: 2 000+ / 5 000+

---

## Step 6 — Arabic Copy Support

If bilingual, add RTL support:

```css
[dir="ar"] {
  direction: rtl;
  font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
}
```

Key Arabic phrases:
- التوصيل عند الاستلام (Cash on delivery)
- التوصيل في 24 ساعة (Delivery in 24h)
- التوصيل عبر 58 ولاية (Delivery across 58 wilayas)
- الدفع آمن ومضمون (Secure guaranteed payment)
- تتبع طردك في الوقت الفعلي (Real-time package tracking)
- إنشاء حساب مجاني (Create free account)

---

## Step 7 — Conversion Optimization Checklist

Before outputting the final page, verify:

- [ ] COD / "paiement à la livraison" appears in hero or within first scroll
- [ ] Wilaya count is stated (55 or 58)
- [ ] Delivery speed (24h nord, 48h sud) is mentioned
- [ ] At least one primary CTA is above the fold
- [ ] WhatsApp contact link is included (format: `https://wa.me/213XXXXXXXXX`)
- [ ] Mobile-first layout (flex/grid, no fixed widths >100vw)
- [ ] Page loads fast — no heavy external dependencies beyond Google Fonts
- [ ] "Ramassage gratuit" or pickup terms are stated if applicable
- [ ] Real-time tracking is mentioned as a feature
- [ ] Social proof (number of clients, client logos or testimonials) present
- [ ] App download section if relevant (Android priority)
- [ ] Footer has address, phone, email, social links

---

## Step 8 — Code Output Format

Output a **single self-contained HTML file** with:
- Embedded CSS in `<style>` tag (no external CSS files needed)
- Minimal vanilla JS in `<script>` tag (scroll animations, mobile menu toggle, stats counter)
- Google Fonts via CDN link
- No jQuery, no heavy frameworks
- Responsive: mobile-first with breakpoints at 768px and 1024px
- Semantic HTML5 elements (`<header>`, `<main>`, `<section>`, `<footer>`)
- `lang="fr"` on `<html>` (or `"ar"` for Arabic-primary)

For React artifact output, use Tailwind classes and keep all state in memory.

---

## Reference Files

- `references/market-data.md` — Detailed competitive analysis, pricing benchmarks, customer pain points
- `references/copy-bank.md` — Expanded FR/AR copy for each section

Read these if you need deeper inspiration or if the user requests something specific to a known competitor.
