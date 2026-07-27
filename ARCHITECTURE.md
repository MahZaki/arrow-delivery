# Arrow Delivery — Architecture Document

> Last updated: July 2026
> This document describes the current state of the application and identifies areas for improvement.

---

## 1. Overview

Arrow Delivery is a logistics SaaS platform for the Algerian delivery market. It acts as a multi-carrier reseller management layer on top of **ZR Express** (primary) and **Ecotrack** (legacy). The platform enables a master reseller to create sub-accounts, manage orders, track finances, and communicate with customers via WhatsApp.

**Core value proposition:** A single dashboard to manage all shipping operations across carriers, with a master/sub-account hierarchy for reseller businesses.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript (strict) | No runtime type checks, no validation library |
| UI Framework | React 19 | No concurrent features used |
| Routing | react-router-dom v7 (HashRouter) | SPA with hash-based routing |
| Styling | Tailwind CSS 3 | Custom theme (`arrow-*` colors) |
| Icons | lucide-react | |
| Build | Vite 6 | Dev server on port 3000 |
| Auth & DB | Supabase (PostgreSQL + Auth + RLS) | Single project |
| Carrier API | ZR Express (`api.zrexpress.app`) | Vercel proxy rewrites |
| Legacy API | Ecotrack (`arrow.ecotrack.dz`) | Direct calls from browser |
| WhatsApp | WaSender API (`wasenderapi.com`) | Vercel proxy rewrite |
| Deployment | Vercel | SPA with rewrites, no serverless functions |

---

## 3. Project Structure

```
arrow-delivery/
├── index.html                    # SPA entry point
├── package.json                  # 4 runtime deps, 6 dev deps
├── vite.config.ts                # Vite config + ZR/WaSender proxy plugins (dev only)
├── tailwind.config.js            # Custom theme
├── vercel.json                   # Production proxy rewrites
├── tsconfig.json
│
├── index.tsx                     # React root (HashRouter)
├── index.css                     # Tailwind directives + scrollbar-hide utility
├── App.tsx                       # Route definitions, providers, layout switching
├── types.ts                      # All TypeScript interfaces (~960 lines)
├── constants.ts                  # Static data: archived numbers, statuses, wilayas, pricing
│
├── lib/
│   └── supabase.ts               # Supabase client init (10 lines)
│
├── contexts/
│   ├── AuthContext.tsx            # Auth state, login/signup, credentials, sub-accounts
│   └── DataContext.tsx            # Pricing/desks static data, user management
│
├── services/
│   ├── api.ts                    # Ecotrack API client (~470 lines)
│   ├── zrExpressApi.ts           # ZR Express API client (~510 lines)
│   ├── resellerApi.ts            # Supabase queries for reseller_parcels
│   ├── transactionApi.ts         # Supabase queries for transactions
│   ├── financialApi.ts           # Payouts, settlement
│   ├── crmService.ts             # CRM orders CRUD + carrier sync
│   ├── whatsappService.ts        # WaSender proxy: send message
│   └── whatsappCampaignService.ts # Campaign CRUD + execution
│
├── components/
│   ├── Sidebar.tsx               # Authenticated navigation sidebar
│   ├── Navbar.tsx                # Public navigation bar
│   ├── Footer.tsx                # Minimal footer
│   ├── ProtectedRoute.tsx        # Auth guard
│   ├── LoadingSpinner.tsx        # Loading indicator
│   ├── StatusBadge.tsx           # Color-coded status badge
│   ├── ZrDashboardContent.tsx    # ZR Express dashboard (~1230 lines)
│   ├── ZrSubAccountContent.tsx   # Sub-account dashboard (~530 lines)
│   └── AdminDashboardView.tsx    # Admin command center (~380 lines)
│
├── pages/
│   ├── Home.tsx                  # Landing page
│   ├── Dashboard.tsx             # Dashboard router (~630 lines)
│   ├── Tracking.tsx              # Multi-carrier tracking
│   ├── Login.tsx                 # Login page
│   ├── Admin.tsx                 # Admin panel (users, pricing, desks, carriers)
│   ├── AdminLogin.tsx            # Admin login
│   ├── Pricing.tsx               # Public pricing page
│   ├── Finance.tsx               # Finance overview
│   ├── Balance.tsx               # Payout management
│   ├── ZrCreateOrder.tsx         # Single order creation
│   ├── ArchivedImport.tsx        # Ecotrack archive import
│   ├── Claims.tsx                # Claims management
│   ├── Webhooks.tsx              # Webhook management
│   ├── Crm.tsx                   # CRM order management
│   └── WhatsAppCampaigns.tsx     # WhatsApp campaign management
│
├── data/
│   └── officesData.ts            # 107 office locations (static)
│
└── scripts/
    ├── migration.sql             # DB migrations (7 files)
    └── parse_offices.py          # Office data parser
```

---

## 4. Routing Architecture

### Layout switching (App.tsx)

```
Unauthenticated:
  Navbar (top) → main content → Footer (bottom)

Authenticated:
  Sidebar (fixed left 64px) → main content (offset md:ml-64)
```

### Route table

| Path | Component | Auth | Notes |
|---|---|---|---|
| `/` | Home | No | Landing page |
| `/track` | Tracking | No | Multi-carrier tracking |
| `/pricing` | Pricing | No | Public pricing |
| `/login` | Login | No | Email/password login |
| `/admin/login` | AdminLogin | No | Separate admin login |
| `/dashboard` | Dashboard | Yes | Smart router (see below) |
| `/crm` | Crm | Yes | CRM order management |
| `/zr-create-order` | ZrCreateOrder | Yes | New order form |
| `/finance` | Finance | Yes | Finance overview |
| `/balance` | Balance | Yes | Payout management |
| `/archive` | ArchivedImport | Yes | Archive import tool |
| `/claims` | Claims | Yes | Claims management |
| `/webhooks` | Webhooks | Yes | Webhook config |
| `/whatsapp` | WhatsAppCampaigns | Yes | Campaign management |
| `/admin` | Admin | Yes (admin) | Admin panel |

### Dashboard routing logic (pages/Dashboard.tsx)

The Dashboard page is a smart router that renders different components based on user role and carrier:

```
if (user.carrier === 'zrexpress'):
  if (no ZR credentials):
    if (user has master):
      → "Contact admin" message
    else:
      → ZR credential setup form
  else if (user has master_id):
    → ZrSubAccountContent (sub-account view)
  else:
    → ZrDashboardContent (master view)

else (ecotrack mode):
  if (user.role === 'admin'):
    → AdminDashboardView
  else:
    → Ecotrack dashboard (inline in Dashboard.tsx)
```

---

## 5. Data Model (Supabase)

### Tables

#### `profiles`
Extends Supabase `auth.users`. Every authenticated user has one.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID (PK, FK→auth.users) | User ID |
| `email` | text | Email |
| `full_name` | text | Display name |
| `role` | text | `'admin'` or `'client'` |
| `master_id` | UUID (FK→profiles) | Parent account (null for masters) |
| `carrier` | text | `'ecotrack'` or `'zrexpress'` |
| `api_token` | text | Ecotrack API token |
| `zr_tenant_id` | text | ZR Express tenant ID |
| `zr_api_key` | text | ZR Express API key |
| `zr_supplier_id` | text | ZR Express supplier ID |
| `wa_sender_api_key` | text | WaSender API key |
| `markup_type` | text | `'flat'` or `'percentage'` |
| `markup_value` | number | Markup for sub-accounts |

#### `crm_orders`
Central order table for CRM functionality.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Order ID |
| `profile_id` | UUID (FK→profiles) | Owner |
| `carrier` | text | Which carrier |
| `tracking_number` | text | Tracking number |
| `status` | text | Current status |
| `client_name` | text | Customer name |
| `client_phone` | text | Customer phone |
| `client_email` | text | Customer email |
| `wilaya_id` | text | Wilaya code |
| `city` | text | City |
| `district` | text | District |
| `street_address` | text | Street |
| `cod_amount` | numeric | Cash on delivery amount |
| `delivery_price` | numeric | Delivery fee |
| `return_price` | numeric | Return fee |
| `product_description` | text | Products |
| `quantity` | int | Item count |
| `weight` | numeric | Package weight |
| `notes` | text | Notes |
| `zr_parcel_id` | text | ZR Express parcel ID |
| `carrier_raw` | jsonb | Full carrier response |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |
| | UNIQUE(profile_id, tracking_number) | |

#### `reseller_parcels`
Legacy parcel tracking for reseller orders.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | ID |
| `profile_id` | UUID | Owner |
| `zr_parcel_id` | text | ZR parcel ID |
| `tracking_number` | text | Tracking |
| `cod_amount` | numeric | COD amount |
| `zr_delivery_price` | numeric | Carrier delivery price |
| `my_delivery_price` | numeric | Reseller's delivery price |
| `zr_return_price` | numeric | Return price |
| `state` | text | Current state |
| `delivered_at` | timestamptz | Delivery timestamp |
| `settled` | boolean | Whether paid out |
| `payout_id` | UUID | Linked payout |

#### `transactions`
Financial transaction log.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | ID |
| `profile_id` | UUID | Owner |
| `type` | text | `delivery_fee`, `return_fee`, `deposit`, `withdrawal`, `adjustment`, `payout` |
| `amount` | numeric | Amount |
| `ref_parcel_id` | UUID | Related parcel |
| `description` | text | Description |

#### `sub_account_payouts`
Payout requests from sub-accounts to master.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | ID |
| `sub_account_id` | UUID | Requester |
| `master_id` | UUID | Approver |
| `amount` | numeric | Amount |
| `status` | text | `pending`, `accepted`, `rejected` |
| `reference` | text | Reference note |

#### `payout_parcels`
Junction: which parcels are included in a payout.

#### `whatsapp_campaigns`
Campaign definitions.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | ID |
| `profile_id` | UUID | Owner |
| `name` | text | Campaign name |
| `message_template` | text | Template with `{placeholders}` |
| `status` | text | `draft`, `sending`, `completed`, `cancelled` |
| `recipient_count` | int | Total recipients |
| `sent_count` | int | Successfully sent |
| `failed_count` | int | Failed |
| `carrier_filter` | text | `ecotrack`, `zrexpress`, `all` |
| `status_filter` | text | Status filter |

#### `whatsapp_recipients`
Individual recipients per campaign.

#### `pricing`
Per-wilaya delivery pricing (loaded statically into DataContext).

#### `stations` / `desks`
Pickup station data (loaded statically into DataContext).

### Row Level Security (RLS) Policies

- **reseller_parcels**: Users see own data; admins see all
- **transactions**: Users see own data; admins see all
- **crm_orders**: Users see own + master's sub-accounts; masters see sub-accounts; admins see all
- **sub_account_payouts**: Sub-accounts see own; admins see all
- **payout_parcels**: Linked via payout to sub-account; admins see all
- **whatsapp_campaigns/recipients**: Users manage own

---

## 6. API Integration Layer

### ZR Express (Primary Carrier)

**All requests go through Vercel proxy rewrites**, which inject `X-Api-Key` and `X-Tenant` headers.

```
Client → /api/zr/* → Vercel Rewrite → https://api.zrexpress.app/api/v1.0/*
```

- **Dev mode:** Vite proxy plugin handles this (vite.config.ts)
- **Production:** Vercel rewrites (vercel.json)

The ZR API client (`services/zrExpressApi.ts`, ~510 lines) provides:
- Parcel CRUD (search, create, update amount/customer, bulk delete)
- Label generation (individual + batch)
- Refund, exchange, modification requests
- Territory/rate lookups
- Supplier balance & stats
- Claims management
- Webhook registration
- In-memory caching with 5-minute TTL

### Ecotrack (Legacy Carrier)

**Direct browser calls** to `https://arrow.ecotrack.dz` (configured via `VITE_API_URL`).

The Ecotrack client (`services/api.ts`, ~470 lines) provides:
- Order fetching (active + archived from DB)
- Tracking
- Auto-archiving of disappeared orders
- In-memory caching

### WaSender (WhatsApp)

**Vercel proxy rewrite:**
```
Client → /api/wa/send-message → https://www.wasenderapi.com/api/send-message
```

Simple proxy — no header injection needed (API key sent in request body).

---

## 7. Authentication & Authorization

### Auth Flow

1. User logs in via Supabase Auth (email/password)
2. `AuthContext` fetches the user's `profiles` row
3. If no profile exists, one is auto-created with defaults (`role: 'client'`, `carrier: 'ecotrack'`)
4. Profile data is stored in React state (`AuthContext.user`)

### Role Hierarchy

```
Admin (role='admin', no master_id)
  └── Master Reseller (role='admin', no master_id)
       └── Sub-Account (role='client', master_id=master.id)
```

**Key distinction:**
- `role='admin'` + no `master_id` → Master/Admin
- `role='admin'` + has `master_id` → Sub-account with admin privileges
- `role='client'` → Regular sub-account

### Credential Resolution

ZR credentials are resolved with inheritance:
1. Check user's own `zr_tenant_id` / `zr_api_key`
2. If null and user has `master_id`, fetch master's credentials
3. If still null, show setup form

---

## 8. Component Architecture

### Component Size Distribution

| Component | Lines | Responsibility |
|---|---|---|
| `ZrDashboardContent.tsx` | ~1230 | **Everything** ZR: stats, table, CRUD, bulk, import, modals |
| `Dashboard.tsx` | ~630 | Ecotrack dashboard + smart routing |
| `Admin.tsx` | ~600 | Admin panel with tabs |
| `Tracking.tsx` | ~600 | Multi-carrier tracking page |
| `ZrSubAccountContent.tsx` | ~530 | Sub-account dashboard |
| `Home.tsx` | ~420 | Landing page |
| `AdminDashboardView.tsx` | ~380 | Admin command center |
| `Crm.tsx` | ~400 | CRM page |
| `WhatsAppCampaigns.tsx` | ~400 | Campaign management |
| `ZrCreateOrder.tsx` | ~350 | Order creation form |
| `Balance.tsx` | ~350 | Payout management |
| `Finance.tsx` | ~300 | Finance overview |
| `Login.tsx` | ~200 | Login page |
| `Sidebar.tsx` | ~180 | Navigation |

### State Management

**No global state library.** Everything is either:
1. **React Context** (AuthContext, DataContext) — for auth and static data
2. **Component-local `useState`** — for all UI state, API data, loading states

`ZrDashboardContent.tsx` alone has **~40 `useState` hooks** managing:
- Parcel list, loading, error, pagination
- Search, date filters, sub-account filter
- Selected items (bulk actions)
- Modals (refund, exchange, modify, edit, bulk import)
- Treasury balance, stats
- Owner map (sub-account ownership)

### Data Fetching

**No data fetching library** (no React Query, no SWR). All fetching is done with:
- `useEffect` + `useState` for initial loads
- Manual `async` functions called from event handlers
- In-memory caching in service files (`zrExpressApi.ts`, `api.ts`)

---

## 9. Key Pain Points & Technical Debt

### Critical Issues

1. **Monolithic components.** `ZrDashboardContent.tsx` (1230 lines) and `Dashboard.tsx` (630 lines) contain all logic in single files. No separation of concerns.

2. **No data fetching abstraction.** Every component manually manages loading/error/data states with `useState`. No caching, no deduplication, no background refetching.

3. **Inline modal management.** Modals (refund, exchange, modify, edit, bulk import) are all state-driven within the same component, not composable.

4. **Duplicate code.** `api.ts` and `zrExpressApi.ts` share identical caching logic (`getCached`, `setCache`, `wait`). Status badge logic is duplicated across components.

5. **No validation.** No Zod, no Yup, no form validation library. All validation is ad-hoc `if (!field)` checks.

6. **Security: API keys in localStorage.** Ecotrack `api_token` is stored in both Supabase and localStorage. ZR credentials are in Supabase only.

### Moderate Issues

7. **`types.ts` is a monolith.** 957 lines of interfaces in one file. ZR types, user types, financial types, CRM types all mixed.

8. **No error boundary.** Any runtime error crashes the entire app.

9. **No tests.** No test files, no test framework configured.

10. **No linting.** No ESLint/Prettier configured (no `npm run lint` script).

11. **Mixed data sources.** Pricing and desks are loaded from static constants (`PRICING_DATA`, `DESK_DATA`) but the DataContext also has DB CRUD operations that never actually persist to the displayed data (the `refreshData` function resets to static constants).

12. **Hardcoded magic strings.** Status strings (`'livre_non_encaisse'`, `'prete_a_expedier'`) are scattered throughout components, not centralized.

13. **No loading skeletons.** Only spinner-based loading states.

14. **No optimistic updates.** All mutations wait for server response before updating UI.

15. **HashRouter instead of BrowserRouter.** URLs have `#` prefix. Not ideal for SEO or sharing.

### Minor Issues

16. **Unused Gemini API key** in vite.config.ts `define` block.
17. **No favicon/icon optimization.** External imgur URL for logo.
18. **Font stack inconsistent.** Tailwind config uses `Segoe UI` but index.html loads Google Fonts (Poppins, Outfit) that are unused.
19. **Navbar shown for authenticated users on non-dashboard pages** — UX inconsistency.

---

## 10. Database Migration History

The project has evolved through 7 SQL migrations:

1. `migration.sql` — Core reseller system (reseller_parcels, transactions, profile enhancements)
2. `migration_crm.sql` — CRM orders table
3. `migration_financial.sql` — Payouts and settlement tracking
4. `migration_whatsapp.sql` — WhatsApp campaign infrastructure
5. `migration_crm_rls.sql` — Updated CRM RLS for master/sub-account cross-visibility
6. `migration_carrier.sql` — Carrier field on profiles
7. Various profile field additions (ZR credentials, markup, WaSender key)

---

## 11. Deployment Architecture

```
GitHub (main branch)
    ↓ push
Vercel (auto-deploy)
    ↓ build
Static SPA (dist/)
    ↓ serve
Vercel Edge Network
    ├── /api/zr/* → https://api.zrexpress.app/api/v1.0/* (rewrite)
    ├── /api/wa/send-message → https://wasenderapi.com/api/send-message (rewrite)
    ├── /* → /index.html (SPA fallback)
    └── /index.html (static assets)
```

No serverless functions. All business logic runs client-side. The Vercel rewrites are purely for CORS proxying.

---

## 12. Planned Improvements

### Phase 1: Architecture Cleanup
- [ ] Split `ZrDashboardContent.tsx` into sub-components (StatsBar, ParcelTable, Modals, BulkImport)
- [ ] Extract shared utilities (caching, status mapping, phone formatting)
- [ ] Organize `types.ts` into domain-specific files (`types/zr.ts`, `types/user.ts`, etc.)
- [ ] Add ESLint + Prettier configuration
- [ ] Add React Query (TanStack Query) for data fetching

### Phase 2: Code Quality
- [ ] Add Zod schemas for API request/response validation
- [ ] Add Error Boundaries around route-level components
- [ ] Centralize status string constants
- [ ] Remove unused Gemini API key config
- [ ] Fix font loading (actually use Poppins/Outfit or remove them)

### Phase 3: UX Improvements
- [ ] Loading skeletons instead of spinners
- [ ] Optimistic updates for mutations
- [ ] Toast notifications for success/error feedback
- [ ] Proper form validation with error messages
- [ ] Responsive table improvements (card view on mobile)

### Phase 4: Features
- [ ] Real-time updates via Supabase Realtime subscriptions
- [ ] Batch operations with progress tracking
- [ ] Advanced analytics / reporting
- [ ] Multi-language support (FR/AR)
- [ ] Push notifications for order status changes
