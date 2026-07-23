# Arrow Delivery + ZR Express — Project Status

## Project Location
`/Users/mac/Downloads/arrow-delivery (1)/`

## Tech Stack
- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS 3
- **Routing:** HashRouter (react-router-dom v7)
- **Icons:** lucide-react
- **Auth & DB:** Supabase (Postgres + Auth)
- **APIs:** Ecotrack (Arrow) + ZR Express
- **Deployment:** Vercel (SPA with rewrites)

## Git Remote
`https://github.com/MahZaki/arrow-delivery.git` (branch: `main`)

---

## File Map

### Core app
| File | Purpose |
|------|---------|
| `App.tsx` | Routes, providers wrapping |
| `index.tsx` | ReactDOM entry |
| `index.html` | HTML shell |
| `vite.config.ts` | Vite config + ZR proxy middleware |
| `vercel.json` | Vercel rewrites (ZR proxy, SPA fallback) |
| `tailwind.config.js` | Custom theme (arrow colors) |
| `tsconfig.json` | TS config |

### Types
| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | 562 | All interfaces: Order, TrackingInfo, ZrParcel, ZrCredentials, ZrHub, ZrLabel*, ZrParcelStateHistoryEntry, ResellerParcel, Transaction, UserProfile, etc. |

### Services
| File | Lines | Purpose |
|------|-------|---------|
| `services/api.ts` | ~250 | Ecotrack API client (fetch orders, track, archive) |
| `services/zrExpressApi.ts` | 279 | ZR API client (parcels CRUD, rates, territories, workflows, customers, hubs, labels, state history, stats) |
| `services/resellerApi.ts` | 36 | Local Supabase queries for `reseller_parcels` table |
| `services/transactionApi.ts` | 41 | Local Supabase queries for `transactions` table |

### Contexts
| File | Purpose |
|------|---------|
| `contexts/AuthContext.tsx` | Auth state, login/signup, API token management, ZR credential management, master/sub-account system, `resolveZrCredentials()` |
| `contexts/CarrierContext.tsx` | Carrier toggle (ecotrack | zrexpress), persisted to localStorage |
| `contexts/DataContext.tsx` | Static pricing/desks data + admin CRUD |

### Pages
| File | Lines | Purpose |
|------|-------|---------|
| `pages/Dashboard.tsx` | 610 | Main dashboard — carrier toggle, Ecotrack order table, ZR parcel switch |
| `pages/ZrCreateOrder.tsx` | 470 | ZR Express parcel creation form (customer, delivery, products, rates, hub selection, label) |
| `pages/Tracking.tsx` | 459 | Dual-carrier tracking — Ecotrack history timeline + ZR state history timeline + label button |
| `pages/Home.tsx` | ~892 | Marketing landing page |
| `pages/Login.tsx` | ~267 | Auth flow |
| `pages/Admin.tsx` | ~628 | Admin CMS (users, pricing, stations) |
| `pages/AdminLogin.tsx` | ~123 | Admin-specific login |
| `pages/Finance.tsx` | ~629 | Performance dashboard with charts |
| `pages/Pricing.tsx` | ~182 | Static pricing tables + stop-desk locations |
| `pages/ArchivedImport.tsx` | ~457 | CSV import/export for archived orders |

### Components
| File | Lines | Purpose |
|------|-------|---------|
| `components/ZrDashboardContent.tsx` | 314 | Master account ZR parcel table (search, filter, paginate, label button) |
| `components/ZrSubAccountContent.tsx` | 172 | Sub-account ZR parcel table (from local DB, label button) |
| `components/AdminDashboardView.tsx` | ~247 | Admin KPI dashboard |
| `components/Navbar.tsx` | ~126 | Top nav with carrier-aware styling |
| `components/Footer.tsx` | ~22 | Simple footer |
| `components/LoadingSpinner.tsx` | ~12 | Spinner |
| `components/ProtectedRoute.tsx` | ~16 | Auth guard |
| `components/StatusBadge.tsx` | ~41 | Color-coded status pill |

### Config & Data
| File | Purpose |
|------|---------|
| `constants.ts` | STATUS_TRANSLATIONS, WILAYAS (58), PRICING_DATA (50 entries), DESK_DATA |
| `data/officesData.ts` | 102 stop-desk locations |
| `scripts/migration.sql` | Supabase schema for reseller system |
| `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_API_URL` |

---

## Database Schema (Supabase)

### `profiles` table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, from auth.users |
| email | TEXT | |
| role | TEXT | 'admin' \| 'client' |
| api_token | TEXT | Ecotrack API token |
| zr_tenant_id | TEXT | ZR Express tenant |
| zr_api_key | TEXT | ZR Express API key |
| master_id | UUID | References profiles(id) — sub-account link |
| markup_type | TEXT | 'flat' \| 'percentage' |
| markup_value | DECIMAL | Default 0 |

### `reseller_parcels` table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, gen_random_uuid() |
| profile_id | UUID | FK → profiles(id) |
| zr_parcel_id | TEXT | ZR's UUID |
| tracking_number | TEXT | ZR tracking (DZ-AL-...) |
| cod_amount | DECIMAL | Cash on delivery amount |
| zr_delivery_price | DECIMAL | ZR's base delivery fee |
| my_delivery_price | DECIMAL | Price after markup |
| zr_return_price | DECIMAL | Return fee |
| state | TEXT | Current state name |
| delivered_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `transactions` table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| profile_id | UUID | FK → profiles(id) |
| type | TEXT | 'delivery_fee' \| 'return_fee' \| 'deposit' \| 'withdrawal' \| 'adjustment' |
| amount | DECIMAL | Negative for fees |
| ref_parcel_id | UUID | FK → reseller_parcels(id) |
| description | TEXT | Usually tracking number |
| created_at | TIMESTAMPTZ | |

### RLS Policies
- `reseller_parcels_self`: profile_id = auth.uid()
- `reseller_parcels_master`: admin role bypass
- `transactions_self`: profile_id = auth.uid()
- `transactions_master`: admin role bypass

---

## ZR Express API Integration (services/zrExpressApi.ts)

### Endpoints implemented
| Function | API Path | Method |
|----------|----------|--------|
| `searchParcels` | `/parcels/search` | POST |
| `createParcel` | `/parcels` | POST |
| `getParcelById` | `/parcels/{id}` | GET |
| `getParcelByTracking` | `/parcels/{trackingNumber}` | GET |
| `getDeliveryRate` | `/delivery-pricing/rates/{id}` | GET |
| `getAllRates` | `/delivery-pricing/rates` | GET |
| `getTerritories` | `/territories/search` | POST |
| `getAllWilayas` | (paginates all territories, filters level=wilaya) | |
| `getCommunesByWilaya` | (paginates all territories, filters parentId) | |
| `searchWorkflows` | `/workflows/search` | POST |
| `updateParcelState` | `/parcels/{id}/state` | PATCH |
| `createCustomer` | `/customers` | POST |
| `searchCustomers` | `/customers/search` | POST |
| `searchHubs` | `/hubs/search` | POST |
| `getSupplierInfo` | `/supplier/{id}` | POST |
| `generateIndividualLabels` | `/parcels/labels/individual` | POST |
| `getParcelStateHistory` | `/parcels/{id}/state-history` | GET |
| `getParcelStats` | `/parcels/stats` | GET |

### Proxy
- **Dev:** Vite middleware at `/api/zr/*` → `https://api.zrexpress.app/api/v1.0/*`
- **Prod:** Vercel rewrite at `/api/zr/(.*)` → `https://api.zrexpress.app/api/v1.0/$1`

### Auth
- `X-Tenant` header + `X-Api-Key` header
- Tenant/API key stored on `profiles` table
- Sub-accounts inherit from master via `resolveZrCredentials()`
- Retry: 3 attempts with exponential backoff
- Cache: 5 min TTL for territories and rates

---

## Feature Status

### ✅ Completed
- [x] **Phase 0 — Carrier system**
  - CarrierContext with localStorage persistence
  - Carrier toggle on Dashboard + Tracking page
  - ZR Express proxy (Vite + Vercel)

- [x] **Phase 1 — Master Reseller System**
  - Supabase migration (profiles columns, reseller_parcels, transactions tables, RLS)
  - Master/sub-account auth flow
  - Credential inheritance (`resolveZrCredentials`)
  - Admin UI for sub-account management & markup config
  - Sub-account dashboard (`ZrSubAccountContent`) showing local parcels

- [x] **Phase 2A — Create + Manage Parcels**
  - ZR territory fetch (wilayas + communes, client-side filter, paginated 1000/page)
  - `getAllRates` with `{ rates: [...] }` response format — cached Map lookup
  - Per-commune rate fallback to wilaya rate
  - Parcel creation form (`ZrCreateOrder.tsx`) with customer, delivery, products, pricing
  - Local DB save + transaction ledger (`delivery_fee` deduction)
  - Auto state transition to ReadyToDispatch after creation
  - Delivery rate display with markup calculation

- [x] **Phase 2B — Hub Selection, Labels, State History**
  - Hub search with `isPickupPoint` filter
  - Pickup-point dropdown on create form
  - `hubId` in parcel payload for pickup-point delivery
  - Label generation (`POST /parcels/labels/individual`)
  - Label button on: create order success, dashboard table, sub-account table, tracking page
  - Spinner + error handling during label generation
  - State history timeline on tracking page (reverse chronological with hub/location/situations)
  - Scroll-to-top after parcel creation

### 🚧 Next Up
- [ ] **State transition controls** on tracking/dashboard (dropdown to change parcel state)
- [ ] **Bulk label printing** — checkbox selection on dashboard + "Print Selected"
- [ ] **Bulk import** — CSV/Excel parcel import
- [ ] **Finance dashboard** for ZR Express (wallet balance, transaction history)
- [ ] **Wallet top-up UI** (deposits to ZR Express account)

### 🐛 Known Bugs
- None currently open

---

## Key Implementation Notes

### Rate lookup flow
1. `getAllRates(credentials)` fetches `GET /delivery-pricing/rates` → returns `{ rates: ZrDeliveryRate[] }`
2. Results cached in a `Map<territoryId, rate>`
3. When user selects commune, look up commune ID → fallback to wilaya ID
4. Extract price matching `deliveryType` (home | pickup-point) or default to home price
5. Apply markup (`calcMyPrice`): flat addition or percentage, based on master's markup config
6. Display base rate + reseller's price in the form

### Label button locations
| Location | File | Line |
|----------|------|------|
| Create order success | `pages/ZrCreateOrder.tsx` | 253 |
| Master dashboard | `components/ZrDashboardContent.tsx` | 246 |
| Sub-account dashboard | `components/ZrSubAccountContent.tsx` | 123 |
| Tracking page (ZR mode) | `pages/Tracking.tsx` | 183 |

### FK Gotcha
`transactions.ref_parcel_id` references `reseller_parcels(id)` (local UUID), NOT `zr_parcel_id` (ZR's UUID). `saveParcel()` returns the local `id`. This was a bug that was fixed.

### Territories API limitation
The `/territories/search` endpoint does NOT support `advancedFilter` with `level` filtering reliably. Instead, we fetch ALL territories with `pageSize: 1000` and filter client-side by `level` and `parentId`.

---
Last updated: 2026-07-23
