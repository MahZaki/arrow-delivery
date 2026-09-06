# Arrow Delivery — Architecture Document

> Last generated: September 2026
> This document describes the current architecture of the app and, in detail, how it is routed and how data flows.

---

## 1. Overview

**Arrow Delivery** is a logistics / cash-on-delivery (COD) SaaS platform for the Algerian market. It is a multi-carrier reseller management layer built on top of **ZR Express** (primary carrier) and **Ecotrack** (legacy carrier).

The platform lets a **master reseller** create **sub-accounts**, then manage all shipping operations for those sub-accounts across both carriers from a single dashboard: order tracking, order creation, claims, finance/payouts, CRM, and WhatsApp marketing.

**Core value proposition:** one dashboard to run every aspect of a delivery-reselling business, with a master → sub-account hierarchy, per-sub-account markup pricing, and automated financial settlement.

Comments in the code base reference "phases" (Phase 2A/2B/2C/2D, Phase 3) describing the history of features — this is useful context but not an active code-level architecture.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript (~strict) | No runtime type validation library |
| UI framework | React 19 | No concurrent features used |
| Routing | react-router-dom v7 (**HashRouter**) | SPA, hash-based routing |
| Styling | Tailwind CSS 3 | Custom `arrow-*` theme colors |
| Icons | lucide-react | |
| Build tool | Vite 6 | Dev server on port `3000` |
| Auth + DB | Supabase (PostgreSQL + Auth + RLS) | Single project |
| Primary carrier | ZR Express (`api.zrexpress.app`) | Proxied through `/api/zr/*` |
| Legacy carrier | Ecotrack (`arrow.ecotrack.dz`) | Called directly from the browser |
| WhatsApp | WaSender (`wasenderapi.com`) | Proxied through `/api/wa/*` |
| Deployment | Vercel | Static SPA + rewrite proxy, no serverless functions |

### Runtime & dev dependencies

```json
dependencies:  @supabase/supabase-js, lucide-react, react, react-dom, react-router-dom
devDependencies: @types/node, @vitejs/plugin-react, autoprefixer, postcss,
                 tailwindcss, typescript, vite
```

---

## 3. Project Structure

```
arrow-delivery/
├── index.html                    # SPA entry point (mounts #root, loads /index.tsx)
├── index.tsx                     # React root: creates root and renders <App/>
├── App.tsx                       # Router, providers, and conditional layout switching
├── types.ts                      # All TypeScript interfaces (~957 lines)
├── constants.ts                  # Static data: archived numbers, status maps, wilayas, pricing
├── tailwind.config.js            # Custom theme + animations
├── vite.config.ts                # Vite config + dev-only ZR/WaSender proxy middleware
├── vercel.json                   # Production rewrite proxy + SPA fallback
├── .env.example / .env.local     # Env vars (Supabase URL/key, Ecotrack VITE_API_URL)
│
├── lib/
│   └── supabase.ts               # Supabase client singleton (init from env vars)
│
├── contexts/                     # React context providers (global state)
│   ├── AuthContext.tsx           # Auth, session, profile, sub-accounts, credentials
│   └── DataContext.tsx           # Pricing/desks static data + admin DB operations
│
├── services/                     # API / data-access layer
│   ├── api.ts                    # Ecotrack client (live + archived orders, tracking)
│   ├── zrExpressApi.ts           # ZR Express client (parcels, claims, webhooks, finance)
│   ├── resellerApi.ts            # reseller_parcels queries + ZR→reseller sync
│   ├── transactionApi.ts         # transactions / balance queries
│   ├── financialApi.ts           # payouts and settlement logic
│   ├── crmService.ts             # CRM orders CRUD + carrier sync
│   ├── whatsappService.ts        # WaSender message sending
│   └── whatsappCampaignService.ts# Campaign CRUD + recipient execution
│
├── components/                   # Reusable UI + shared layout
│   ├── Sidebar.tsx               # Authenticated navigation (admin-aware)
│   ├── Navbar.tsx                # Public navigation
│   ├── Footer.tsx                # Footer (public layout only)
│   ├── ProtectedRoute.tsx        # Auth guard wrapper
│   ├── LoadingSpinner.tsx        # Loading indicator
│   ├── StatusBadge.tsx           # Color-coded carrier status badge
│   ├── ZrDashboardContent.tsx    # ZR master dashboard (~1230 lines)
│   ├── ZrSubAccountContent.tsx   # ZR sub-account dashboard (~530 lines)
│   └── AdminDashboardView.tsx    # Admin command center (~380 lines)
│
├── pages/                        # Route-level page components
│   ├── Home.tsx                  # Public landing page
│   ├── Pricing.tsx               # Public pricing page
│   ├── Tracking.tsx              # Multi-carrier tracking page
│   ├── Login.tsx                 # Client login
│   ├── AdminLogin.tsx            # Admin login
│   ├── Dashboard.tsx             # Smart dashboard router (~630 lines)
│   ├── Admin.tsx                 # Admin panel (users, sub-accounts)
│   ├── ArchivedImport.tsx        # Ecotrack archive import tool
│   ├── Finance.tsx               # Finance overview (~1220 lines)
│   ├── Balance.tsx               # Payout management
│   ├── ZrCreateOrder.tsx         # Order creation form
│   ├── Claims.tsx                # Claims management
│   ├── Webhooks.tsx              # Webhook configuration
│   ├── Crm.tsx                   # CRM order management
│   └── WhatsAppCampaigns.tsx     # WhatsApp campaign management
│
├── data/
│   └── officesData.ts            # 100+ pickup-station locations (static)
│
├── scripts/                      # SQL migrations + offline tools
│   ├── migration.sql, migration_carrier.sql, migration_crm.sql,
│   ├── migration_crm_rls.sql, migration_financial.sql, migration_whatsapp.sql
│   └── parse_offices.py
│
└── supabase/
    ├── config.toml               # Local Supabase config
    └── functions/wa-proxy/       # Supabase Edge Function for WhatsApp
```

---

## 4. Application Bootstrap

1. `index.html` defines `<div id="root">` and loads `index.tsx` as a module.
2. `index.tsx` (the application entry) creates a React root and renders `<App/>` inside `<React.StrictMode>`.
3. `App.tsx` sets up the router, the global providers, and the top-level layout.

```
index.html
    └─ index.tsx
         └─ <React.StrictMode>
              └─ <App/>                     (App.tsx)
                   ├─ <HashRouter>          (router)
                   ├─ <AuthProvider>        (auth state)
                   ├─ <DataProvider>        (pricing/desks/users)
                   └─ <AppLayout/>          (layout + <Routes>)
                        ├─ <Sidebar>  OR  <Navbar>+<Footer>
                        └─ <Routes> → page components
```

Note: the router is `HashRouter`, configured in `App.tsx` (not `index.tsx`). All in-app navigation therefore produces hash URLs like `/#/dashboard`.

---

## 5. Routing Architecture

### 5.1 Layout switching (App.tsx)

`AppLayout` reads `isAuthenticated` from `useAuth()` and renders one of two layouts:

```
Unauthenticated:
  <Navbar> (fixed top) → <main> <Routes/> </main> → <Footer>

Authenticated:
  <Sidebar> (fixed left, w-64) → <main className="md:ml-64"> <Routes/> </main>
```

Both layouts render the **same `<Routes>` block** — so the public routes (`/`, `/track`, `/pricing`, `/login`, `/admin/login`) are reachable whether or not the user is logged in, and the protected routes require auth through `<ProtectedRoute/>`.

### 5.2 Route table

| Path | Component | Auth | Notes |
|---|---|---|---|
| `/` | `Home` | Public | Marketing landing page |
| `/track` | `Tracking` | Public | Multi-carrier tracking; reads `?tracking=` query param |
| `/pricing` | `Pricing` | Public | Static pricing + station lookup |
| `/login` | `Login` | Public | Email/password login (Supabase) |
| `/admin/login` | `AdminLogin` | Public | Admin login |
| `/dashboard` | `Dashboard` | **Protected** | Smart router (see §5.3) |
| `/admin` | `Admin` | **Protected** | Admin panel (role-gated at component level) |
| `/crm` | `Crm` | Protected | CRM order management |
| `/zr-create-order` | `ZrCreateOrder` | Protected | Create a new order |
| `/finance` | `Finance` | Protected | Finance overview |
| `/balance` | `Balance` | Protected | Payout management |
| `/archive` | `ArchivedImport` | Protected | Ecotrack archive import tool |
| `/claims` | `Claims` | Protected | Claims management (ZR) |
| `/webhooks` | `Webhooks` | Protected | Webhook configuration (ZR) |
| `/whatsapp` | `WhatsAppCampaigns` | Protected | WhatsApp campaigns |

### 5.3 Protection mechanism (`ProtectedRoute.tsx`)

The protected routes are nested as children of a route whose element is `<ProtectedRoute/>`:

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  ...
</Route>
```

`ProtectedRoute`:
1. If `isLoading` is true → shows a full-screen `LoadingSpinner` ("Verifying Access...").
2. If authenticated → renders `<Outlet/>` (the matched child page).
3. Otherwise → `<Navigate to="/login" replace/>`.

Because the guard is purely `isAuthenticated`-based, every "protected" page can be reached by any logged-in user. Finer-grained access is enforced **inside** each page component (e.g. `Admin.tsx` returns an "Access Denied" screen when `user.role !== 'admin'`). This is a deliberate pattern in the code — the route guard handles login, and the component handles role.

### 5.4 Dashboard smart routing (`pages/Dashboard.tsx`)

The `/dashboard` route is the most complex page. It inspects the user's **carrier** and **role/master** to decide what to render:

```
if carrier === 'zrexpress':
    if resolving master creds        → <LoadingSpinner/>
    if no ZR credentials:
        if user.master_id            → "Contact admin" message
        else                         → ZR credential setup form
    else:
        if user.master_id            → <ZrSubAccountContent>   (sub-account view)
        else                         → <ZrDashboardContent>    (master view)

else (ecotrack mode):
    if user.role === 'admin'         → <AdminDashboardView>
    else:
        if loading                   → <LoadingSpinner>
        if no api_token              → "Connect Account" token form
        else                         → inline Ecotrack dashboard (status tabs, orders table)
```

This is the page that reconciles the three "kinds" of dashboard the app supports (ZR master, ZR sub-account, Ecotrack) behind a single `/dashboard` URL.

### 5.5 Sidebar navigation (`components/Sidebar.tsx`)

The authenticated sidebar groups navigation into four sections. The `Admin` item is `adminOnly` and hidden for non-admin users:

```
MAIN:      Dashboard (/dashboard), CRM (/crm), New Order (/zr-create-order), Tracking (/track)
FINANCE:   Overview (/finance), Balance (/balance)
SERVICE:   Archive (/archive), Claims (/claims), WhatsApp (/whatsapp)
DEVELOPER: Webhooks (/webhooks), Admin (/admin) [adminOnly]
```

The public `Navbar.tsx` shows: Home, Pricing, Track Order, and (when logged out) Login.

---

## 6. Data Layer

### 6.1 Context providers

**AuthContext** (`contexts/AuthContext.tsx`) — holds the current `UserProfile`, `isAuthenticated`, `isLoading`, and derived `isMaster`. Provides:

- `login` / `signup` / `logout` → wrap `supabase.auth`
- `refreshProfile` → refetch the user's `profiles` row
- `updateApiToken` (Ecotrack token), `updateZrCredentials`, `updateCarrier`, `updateUserCarrier`
- `createSubAccount`, `updateSubAccountMarkup` (master-only)
- `resolveZrCredentials` → returns user's own ZR creds, else inherits from `master_id`

On mount it listens to `supabase.auth.getSession()` and `onAuthStateChange`, then fetches/creates the profile row.

**DataContext** (`contexts/DataContext.tsx`) — provides pricing/desks/users and admin operations:

- `pricing` / `desks` / `flatStations` initialized from `PRICING_DATA` / `DESK_DATA` constants for instant first paint
- `refreshData()` reads the `pricing` and `stations` tables first and falls back to the constants when the tables are empty or unreachable; on the first admin visit it auto-seeds the tables (requires `scripts/migration_pricing_stations.sql`)
- `users` is auto-loaded via `refreshUsers()` whenever an admin session is active
- CRUD/seed operations on `pricing` and `stations` tables in Supabase

### 6.2 Supabase client (`lib/supabase.ts`)

```ts
supabaseUrl = import.meta.env.VITE_SUPABASE_URL
supabaseKey = import.meta.env.VITE_SUPABASE_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
```

Throws at import time if the env vars are missing.

### 6.3 Service layer

All data access is organized into service modules under `services/`. These use either Supabase (`supabase.from(...)`) or raw `fetch` against carrier APIs.

| Service | Responsibility | Backend |
|---|---|---|
| `api.ts` | Live Ecotrack orders, archived orders, order registry, auto-archive, manual import, tracking. In-memory cache + retry/batching. | Ecotrack API + Supabase `orders` |
| `zrExpressApi.ts` | Parcels, rates, labels, workflows, customers, hubs, claims, webhooks, supplier payments, bulk/refund/exchange. In-memory cache + retry. | ZR Express API (`/api/zr/*`) |
| `resellerApi.ts` | `reseller_parcels` reads + `syncZrParcelsToReseller` paginated sync | Supabase |
| `transactionApi.ts` | `transactions` reads and balance computation | Supabase |
| `financialApi.ts` | Sub-account balances, payouts, settlement, payout parcel management | Supabase |
| `crmService.ts` | `crm_orders` CRUD + Ecotrack/ZR sync into CRM | Supabase |
| `whatsappService.ts` | Send a WhatsApp text via WaSender proxy | WaSender |
| `whatsappCampaignService.ts` | Campaigns + recipients CRUD, template interpolation | Supabase |

---

## 7. External API Integration

Three external services are integrated:

### 7.1 ZR Express (primary carrier, `api.zrexpress.app`)

All calls go through a relative proxy base `/api/zr` so the browser never hits the carrier directly (avoids CORS and hides credentials):

```
Client → /api/zr/<path> → (proxy) → https://api.zrexpress.app/api/v1.0/<path>
```

- **Dev:** `vite.config.ts` registers a `zr-proxy` Connect middleware that forward-proxies requests starting with `/api/zr/` and forwards the `X-Tenant` / `X-Api-Key` headers from the client.
- **Prod:** `vercel.json` declares a rewrite `"/api/zr/(.*)" → "https://api.zrexpress.app/api/v1.0/$1"`.

The client library (`zrExpressApi.ts`) attaches `X-Tenant` and `X-Api-Key` headers from the resolved credentials on every request.

### 7.2 Ecotrack (legacy carrier, `arrow.ecotrack.dz`)

Called **directly** from the browser using `VITE_API_URL` (from `constants.ts`) — no proxy. Requests carry an `api_token` query parameter. Key endpoints consume: `/api/v1/get/orders`, `/api/v1/get/orders/status`, `/api/v1/get/tracking/info`.

The Ecotrack client (`api.ts`) adds retry logic, 5-minute in-memory caching, batched pagination, and an auto-archive workflow (see §8).

### 7.3 WaSender (WhatsApp, `wasenderapi.com`)

Prototypical WhatsApp integration:

```
Client → /api/wa/send-message → (rewrite) → https://www.wasenderapi.com/api/send-message
```

Also available as a Supabase Edge Function at `supabase/functions/wa-proxy/index.ts`, which authenticates the caller with `supabase.auth.getUser()` and forwards the request to WaSender with `Authorization: Bearer <apiKey>`.

---

## 8. Order Lifecycle & Eco-track Archival Flow

The ordering/archiving logic is one of the more subtle parts of the app (in `services/api.ts`):

1. `fetchOrdersFromApi` pulls **active** orders from Ecotrack (paginated).
2. `fetchArchivedFromDb` pulls previously-archived orders from the Supabase `orders` table.
3. Live orders take priority; archived orders fill in only where the tracking number is not live.
4. After each fetch, `autoArchiveDisappeared` runs in the background:
   - `updateOrderRegistry` upserts the current live tracking numbers into `order_registry`.
   - `detectDisappearedOrders` finds registry entries no longer present in the live API (= the carrier archived them).
   - Those disappearances are fetched via the filter API and written to `orders` (archive), then removed from the registry.
5. `importArchivedOrders` allows a user to manually import orders by pasting tracking numbers (via `/archive`).

This means the Supabase `orders` table acts as the **archive**, while the carrier API is the **source of active** orders, and `order_registry` bridges the two to detect archival.

---

## 9. Authentication & Authorization

### 9.1 Flow

1. User logs in via Supabase Auth (email/password).
2. `AuthContext` fetches the `profiles` row for `session.user.id`.
3. If missing, a default profile is created (`role: 'client'`, `carrier: 'ecotrack'`).
4. The profile is stored in React state and drives both `isAuthenticated` and routing.

### 9.2 Role hierarchy

```
Admin (role='admin', master_id=null)          ← full platform admin
  └─ Master Reseller (role='admin', master_id=null)  ← creates sub-accounts
       └─ Sub-Account (role='client', master_id=<master>)
```

- `role='admin'` **and no** `master_id` → administrator-level access.
- `role='client'` → standard account, possibly linked to a master.
- `isMaster` is `role === 'admin' && !master_id`.

### 9.3 Credential resolution (ZR)

`resolveZrCredentials`:
1. Use the user's own `zr_tenant_id` / `zr_api_key` if present.
2. Otherwise, if the user has a `master_id`, fetch the master's ZR credentials.
3. Otherwise return `null` → the dashboard shows a setup form / contact-admin message.

---

## 10. Data Model (Supabase tables)

### `profiles`
Extends `auth.users`; one row per user.

`id` (PK), `email`, `full_name`, `role` (`admin`|`client`), `master_id` (nullable FK → profiles), `carrier` (`ecotrack`|`zrexpress`), `api_token` (Ecotrack), `zr_tenant_id`, `zr_api_key`, `wa_sender_api_key`, `markup_type` (`flat`|`percentage`), `markup_value`.

### `orders`
Ecotrack **archive** store. Written by `saveToArchive` / `importArchivedOrders`; upserted on `tracking` conflict. Columns include `tracking`, `user_id`, `client`, `status`, `wilaya_id`, `montant`, `tarif_prestation`, `tarif_retour`, `product`, `phone`, `archived_at`, `updated_at`.

### `order_registry`
Tracks which tracking numbers were last seen as "live" (to detect archival). Columns: `tracking`, `user_id`, `status`, `last_seen_at`.

### `crm_orders`
Central CRM order table. `UNIQUE(profile_id, tracking_number)`; `carrier_raw` holds the full carrier response (jsonb).

### `reseller_parcels`
Legacy per-parcel record for a reseller/profile. Tracks COD amount, the reseller's delivery price vs. ZR's, return price, state, `delivered_at`, `settled`, `payout_id`.

### `transactions`
Financial ledger. Types: `delivery_fee`, `return_fee`, `deposit`, `withdrawal`, `adjustment`, `payout`.

### `sub_account_payouts` & `payout_parcels`
Payout requests (pending/accepted/rejected) and the junction of parcels included in each payout.

### `whatsapp_campaigns` & `whatsapp_recipients`
Campaign definitions (name, template, filters, status, counts) and per-recipient send records.

### `pricing`, `stations`
Wilaya pricing and pickup-station records (loaded statically into `DataContext`).

RLS policies are scoped per table so users see their own data, masters see their sub-accounts, and admins see everything.

---

## 11. State Management & Data Fetching

- **No global state library** (no Redux/Zustand), **no data-fetching library** (no React Query/SWR).
- Global state is limited to the two contexts (`AuthContext`, `DataContext`).
- All page/component state uses local `useState`/`useEffect`.
- API data is fetched imperatively (`useEffect` on mount + handlers) and cached in-memory (5-minute TTL) inside the service modules (`api.ts`, `zrExpressApi.ts`).

---

## 12. Deployment Architecture

```
GitHub (main)
    └─ push → Vercel auto-deploy
        └─ build (vite build → dist/)
            └─ serve static SPA on Vercel Edge Network
                 ├─ /api/zr/*            → https://api.zrexpress.app/api/v1.0/*   (rewrite)
                 ├─ /api/wa/send-message → https://wasenderapi.com/api/send-message (rewrite)
                 └─ /*                   → /index.html                            (SPA fallback)
```

There are **no serverless functions** for the app itself; the `vercel.json` rewrites exist purely for CORS proxying to the carrier APIs. The only serverless artifact is the opt-in Supabase Edge Function for WhatsApp.

**Environment variables (`.env.local`):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (from `lib/supabase.ts`)
- `VITE_API_URL` (Ecotrack base URL, from `constants.ts`)
- `VITE_TENANT_ID` / `VITE_ZR_API_KEY` (dev) and `GEMINI_API_KEY` (injected into build via `vite.config.ts` `define` — appears unused by the app)

---

## 13. Key Architectural Patterns & Observations

- **Route guard vs. role guard are separate concerns.** `ProtectedRoute` only checks login; individual pages (notably `Admin.tsx`) enforce role restrictions themselves.
- **Single smart `/dashboard`.** Carrier + master/sub-account logic is centralized in `Dashboard.tsx`, dispatching to different content components.
- **Proxied third-party APIs** keep CORS and credentials out of the browser except for Ecotrack, which is hit directly with a token query param.
- **Archive via registry diffing.** Sub-systems detect carrier-side archival by comparing `order_registry` (what we last saw) with the live API list.
- **Some code is intentionally duplicated** (caching utilities, status mappings) rather than shared — worth consolidating.
- **No test framework, no lint config, no error boundary** currently configured.

---

## 14. Note on Fast-Reference Router

Core routing entry point: `App.tsx`
- `App.tsx:2` — `HashRouter`
- `App.tsx:40-51` — protected routes nested under `<ProtectedRoute/>`
- `App.tsx:50` — `/admin` (protected, role-checked inside `Admin.tsx`)
- `pages/Dashboard.tsx:275-329` — carrier/role dispatch
