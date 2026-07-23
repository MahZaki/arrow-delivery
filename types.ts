
export interface Order {
  tracking: string;
  client: string;
  wilaya_id: string | number;
  status: string;
  created_at: string;
  // Financial fields from API/DB
  montant?: string | number;
  tarif_prestation?: string | number;
  tarif_retour?: string | number;
  payment_id?: number | null;
  products?: string;
  product?: string;
  phone?: string;
  telephone?: string;
}

export interface TrackingActivity {
  status: string;
  date: string;
  time: string;
  scanLocation?: string;
  reason?: string;
  details?: string;
  postponed_to?: string;
}

export interface TrackingInfo {
  success: boolean;
  tracking: string;
  recipientName: string;
  shippedBy: string;
  originCity: string;
  destLocationCity: string;
  status: string;
  activity: TrackingActivity[];
  message?: string;
  // New detailed fields
  montant?: string;
  tarif_prestation?: string;
  tarif_retour?: string;
  product?: string;
  phone?: string;
  created_at?: string;
}

// Database Entities
export interface PricingItem {
  id?: number;
  city: string;
  zone: number;
  silver_domicile: number;
  silver_stop: number;
  gold_domicile: number;
  gold_stop: number;
  platinum_domicile: number;
  platinum_stop: number;
  // Legacy aliases for backwards compat
  domicile?: number;
  stop?: number;
}

export interface DeskStation {
  id?: number; 
  wilaya: string; 
  name: string;
  address: string;
  phone: string;
  maps_url?: string;
  mapsUrl?: string; // UI convenience helper
}

// UI Helper type (Grouped)
export interface DeskItem {
  wilaya: string;
  stations: DeskStation[];
}

export interface Stats {
  total: number;
  inTransit: number;
  outForDelivery: number;
  delivered: number;
  pending: number;
  cancelled: number;
  suspended: number;
  preparation: number;
}

// ============================================================================
// ZR Express Types
// ============================================================================

export type CarrierType = 'ecotrack' | 'zrexpress';

export interface ZrCredentials {
  tenantId: string;
  apiKey: string;
}

export interface ZrPhone {
  number1: string;
  number2?: string | null;
  number3?: string | null;
}

export interface ZrCustomer {
  customerId: string;
  name: string;
  phone: ZrPhone;
  email?: string;
}

export interface ZrSupplier {
  supplierName: string;
  supplierCityTerritoryId: string;
  supplierHubId: string;
  supplierHubCityTerritoryId: string;
  supplierHubName: string;
  phone: ZrPhone;
  supportPhone: ZrPhone;
}

export interface ZrCoordinates {
  lat: number;
  lng: number;
}

export interface ZrDeliveryAddress {
  street: string;
  city: string;
  cityTerritoryId: string;
  district: string;
  districtTerritoryId: string;
  cityTerritoryCode?: number;
  postalCode?: string;
  country: string;
  coordinates?: ZrCoordinates;
  hubId?: string;
  hubName?: string;
}

export interface ZrWeight {
  weight: number;
  dimensionalWeight?: number;
  effectiveWeight?: number;
}

export interface ZrParcelState {
  id: string;
  name: string;
  description: string;
  isBlocking: boolean;
  isLocked: boolean;
  visibleFor: number;
  editableBy: number;
  color: string;
}

export interface ZrSituation {
  id: string;
  name: string;
  description: string;
  slug: string;
  metadata?: Record<string, string>;
}

export interface ZrProductDimensions {
  length: number;
  width: number;
  height: number;
}

export interface ZrOrderedProduct {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  unitPrice: number;
  quantity: number;
  stockType: string;
  dimensions: ZrProductDimensions;
}

export interface ZrDeliveryPersonHub {
  id: string;
  name: string;
  type: string;
  address: ZrDeliveryAddress;
  services?: Array<{ id: string; type: string }>;
}

export interface ZrDeliveryPerson {
  id: string;
  firstName: string;
  lastName: string;
  phone: ZrPhone;
  hub: ZrDeliveryPersonHub;
  email?: string;
  status?: string;
  isUnavailable?: boolean;
}

export interface ZrParcel {
  id: string;
  customer: ZrCustomer;
  supplier: ZrSupplier;
  deliveryAddress: ZrDeliveryAddress;
  createdAt: string;
  amount: number;
  deliveryPrice: number;
  trackingNumber: string;
  paymentMethod: string;
  deliveryType: string;
  weight?: ZrWeight;
  bagId?: string;
  deliveryPersonId?: string;
  deliveryPerson?: ZrDeliveryPerson;
  state: ZrParcelState;
  lastStateSituationId?: string;
  situation?: ZrSituation;
  tenantId: string;
  lastLocationHubId?: string;
  lastStateUpdateAt: string;
  lastSituationUpdateAt?: string;
  hubStockId?: string;
  description: string;
  productsDescription?: string;
  productsStockType?: string;
  isReturn: boolean;
  isControlled: boolean;
  type: string;
  isExchanged: boolean;
  originalParcelId?: string;
  returnParcelId?: string;
  externalId?: string;
  hasActiveModificationRequest?: boolean;
  orderedProducts: ZrOrderedProduct[];
  ReturnPrice?: number;
}

export interface ZrParcelSearchRequest {
  pageNumber: number;
  pageSize: number;
  orderBy?: string[];
  keyword?: string;
  parcelTypes?: string[];
  advancedSearch?: {
    fields: string[];
    keyword: string;
  };
  advancedFilter?: {
    logic: 'AND' | 'OR';
    filters: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  includeProducts?: boolean;
}

export interface ZrPaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export type ZrParcelSearchResponse = ZrPaginatedResponse<ZrParcel>;

export interface ZrCreateParcelRequest {
  customer: {
    customerId: string;
    name: string;
    phone: {
      number1: string;
      number2?: string;
      number3?: string;
    };
  };
  deliveryAddress: {
    cityTerritoryId: string;
    districtTerritoryId: string;
    street?: string;
  };
  hubId?: string;
  orderedProducts: Array<{
    productId?: string;
    productName: string;
    productSku?: string;
    unitPrice: number;
    quantity: number;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    stockType: string;
  }>;
  deliveryType: 'home' | 'pickup-point' | 'return';
  description: string;
  stateId?: string;
  amount: number;
  weight?: {
    weight: number;
    dimensionalWeight?: number;
  };
  externalId?: string;
  hubStockId?: string;
}

export interface ZrCreateParcelResponse {
  id: string;
}

export interface ZrDeliveryPriceItem {
  deliveryType: 'home' | 'pickup-point' | 'return';
  price: number;
}

export interface ZrDeliveryRate {
  toTerritoryId: string;
  toTerritoryName: string;
  toTerritoryLevel?: string;
  deliveryPrices: ZrDeliveryPriceItem[];
}

export interface ZrTerritory {
  id: string;
  code: number;
  name: string;
  postalCode?: string;
  level: 'wilaya' | 'commune';
  parentId: string | null;
  delivery?: {
    hasHomeDelivery: boolean;
    hasPickupPoint: boolean;
  };
}

export interface ZrTerritorySearchRequest {
  pageNumber?: number;
  pageSize?: number;
  orderBy?: string[];
  keyword?: string;
  advancedSearch?: {
    fields: string[];
    keyword: string;
  };
  advancedFilter?: {
    logic?: 'AND' | 'OR';
    filters: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  level?: string;
  parentId?: string;
}

export type ZrTerritorySearchResponse = ZrPaginatedResponse<ZrTerritory>;

// ============================================================================
// ZR Workflows (State machine)
// ============================================================================

export interface ZrWorkflowState {
  id: string;
  name: string;
  description: string;
  isBlocking: boolean;
  isLocked: boolean;
  visibleFor: number;
  editableBy: number;
  color: string;
}

export interface ZrWorkflow {
  id: string;
  name: string;
  description: string;
  states: ZrWorkflowState[];
}

export interface ZrWorkflowSearchRequest {
  pageNumber: number;
  pageSize: number;
  orderBy?: string[];
  keyword?: string;
}

export type ZrWorkflowSearchResponse = ZrPaginatedResponse<ZrWorkflow>;

export interface ZrUpdateParcelStateRequest {
  stateId: string;
  situationId?: string;
}

// ============================================================================
// ZR Customers
// ============================================================================

export interface ZrCreateCustomerRequest {
  name: string;
  phone: {
    number1: string;
    number2?: string;
    number3?: string;
  };
  email?: string;
}

export interface ZrCustomerSearchRequest {
  pageNumber: number;
  pageSize: number;
  orderBy?: string[];
  keyword?: string;
}

export type ZrCustomerSearchResponse = ZrPaginatedResponse<ZrCustomer>;

// ============================================================================
// ZR Hubs
// ============================================================================

export interface ZrHub {
  id: string;
  name: string;
  type: string;
  isPickupPoint: boolean;
  address: {
    street?: string;
    city?: string;
    cityTerritoryId: string;
    district?: string;
    districtTerritoryId: string;
    postalCode?: string;
    country?: string;
    coordinates?: ZrCoordinates;
  };
  openingHours?: string;
  phone?: ZrPhone;
  services?: Array<{ id: string; type: string }>;
  createdAt?: string;
}

export interface ZrHubSearchRequest {
  pageNumber: number;
  pageSize: number;
  orderBy?: string[];
  keyword?: string;
}

export type ZrHubSearchResponse = ZrPaginatedResponse<ZrHub>;

// ============================================================================
// ZR Labels
// ============================================================================

export interface ZrLabelRequest {
  trackingNumbers: string[];
}

export interface ZrLabelFile {
  trackingNumber: string;
  fileUrl: string;
}

export interface ZrLabelResponse {
  parcelLabelFiles: ZrLabelFile[];
  failedTrackingNumbers: string[];
}

// ============================================================================
// ZR State History
// ============================================================================

export interface ZrParcelStateHistoryEntry {
  id: string;
  createdAt: string;
  previousState?: ZrParcelState;
  newState: ZrParcelState;
  modifiedBy?: { id: string; fullName?: string };
  location?: {
    hubId?: string;
    hubName?: string;
    hubCity?: string;
    hubDistrict?: string;
    type?: string;
    membership?: string;
    hubTerritoryCityId?: string;
  };
  comment?: string;
  situations?: Array<{
    situationName?: string;
    situationSlug?: string;
    situationDescription?: string;
    createdAt: string;
  }>;
}

// ============================================================================
// ZR Supplier Info
// ============================================================================

export interface ZrSupplierInfo {
  id: string;
  name: string;
  cityTerritoryId: string;
  hubId: string;
  hubCityTerritoryId: string;
  phone: ZrPhone;
  supportPhone: ZrPhone;
  priceListId?: string;
  isActive: boolean;
}

// ============================================================================
// ZR Bulk Actions & Edit Types
// ============================================================================

export interface ZrUpdateResponse {
  id: string;
}

export interface ZrUpdateAmountRequest {
  parcelId: string;
  amount: number;
}

export interface ZrUpdateCustomerRequest {
  parcelId: string;
  name?: string;
  phone?: string;
}

export interface ZrUpdateDeliveryAddressRequest {
  parcelId: string;
  deliveryAddress: {
    cityTerritoryId: string;
    districtTerritoryId: string;
    street?: string;
  };
  hubId?: string;
}

export interface ZrMultipleLabelResponse {
  fileUrl: string | null;
  failedTrackingNumbers: string[];
}

export interface ZrBulkDeleteRequest {
  ParcelIds: string[];
}

export interface ZrBulkDeleteSuccessItem {
  index: number;
  parcelId: string;
  trackingNumber: string;
}

export interface ZrBulkDeleteFailureItem {
  index: number;
  errorCode: string;
  errorMessage: string;
}

export interface ZrBulkDeleteResponse {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  successes: ZrBulkDeleteSuccessItem[];
  failures: ZrBulkDeleteFailureItem[];
}

// ============================================================================
// ZR Parcel Actions (Refund, Exchange, Modification Request)
// ============================================================================

export interface ZrCreateRefundRequest {
  customer: {
    customerId: string;
    name: string;
    phone: { number1: string; number2?: string; number3?: string };
  };
  deliveryAddress?: {
    street?: string;
    cityTerritoryId: string;
    districtTerritoryId: string;
  };
  hubId?: string;
  deliveryType: 'home' | 'pickup-point' | 'return';
  description: string;
  amount: number;
  externalId?: string;
}

export interface ZrCreateExchangeRequest {
  customer: {
    customerId: string;
    name?: string;
    phone?: { number1?: string; number2?: string; number3?: string };
    deliveryAddress?: {
      street?: string;
      cityTerritoryId?: string;
      districtTerritoryId?: string;
    };
  };
  hubId?: string;
  orderedProducts: Array<{
    productId?: string;
    productName?: string;
    productSku?: string;
    unitPrice: number;
    quantity: number;
    length: number;
    width: number;
    height: number;
    weight?: number;
    stockType?: string;
  }>;
  deliveryType?: string;
  description?: string;
  stateId?: string;
  weight: { weight: number; dimensionalWeight?: number };
  originalParcelId: string;
  amount: number;
  externalId?: string;
  hubStockId?: string;
}

export interface ZrCreateExchangeResponse {
  newParcelId: string;
  returnParcelId?: string | null;
  originalParcelId?: string | null;
}

export interface ZrCreateModificationRequest {
  parcelId: string;
  amount?: number;
  phone?: {
    number1?: string;
    number2?: string;
    number3?: string;
  };
  deliveryType?: 'home' | 'pickupPoint';
  deliveryAddress?: {
    street?: string;
    city?: string;
    cityTerritoryId?: string;
    district?: string;
    districtTerritoryId?: string;
    postalCode?: string;
    country?: string;
  };
  hubId?: string;
}

// ============================================================================
// Phase 2C: Treasury / Supplier Payments
// ============================================================================

export interface ZrSupplierPaymentTransaction {
  id: string;
  amount: number;
  comment?: string;
  supplier?: { supplierId: string; name: string };
  parcel?: {
    parcelId: string;
    trackingNumber: string;
    customerFullName: string;
    description: string;
    deliveryPrice: number;
    isExchange: boolean;
    isFree: boolean;
    createdAt: string;
    cashReceiptId?: string | null;
  };
}

export interface ZrSupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  costService?: { storage: number; labelling: number };
  createdAt: string;
  cashDrawer?: { id: string; firstName: string; lastName: string };
  referenceId: string;
  status: string;
  transactions?: ZrSupplierPaymentTransaction[];
}

export interface ZrSupplierPaymentSearchRequest {
  pageNumber: number;
  pageSize: number;
  orderBy?: string[];
  keyword?: string;
  includeTransactions?: boolean;
}

export interface ZrSupplierPaymentSearchResponse {
  items: ZrSupplierPayment[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ZrSupplierBalance {
  balance: number;
  pendingAmount?: number;
  totalCollected?: number;
  totalFees?: number;
}

// ============================================================================
// Phase 2D: Claims Management
// ============================================================================

export interface ZrClaimCategory {
  id: string;
  name: string;
}

export interface ZrClaimParcel {
  id: string;
  city: string;
  district: string;
  trackingNumber: string;
  stateName: string;
  customerFullName: string;
  phone: string;
}

export interface ZrClaimState {
  id: string;
  name: string;
  description: string;
  isBlocking: boolean;
  isLocked: boolean;
  color: string;
}

export interface ZrClaimComment {
  id: string;
  claimId: string;
  content: string;
  modifiedBy: { id: string; fullName: string };
  createdAt: string;
}

export interface ZrClaim {
  id: string;
  title: string;
  description: string;
  parcel: ZrClaimParcel;
  state: ZrClaimState;
  category: { id: string; name: string };
  comments?: ZrClaimComment[];
  createdAt: string;
  lastModifiedAt: string;
}

export interface ZrClaimSearchRequest {
  pageNumber: number;
  pageSize: number;
  orderBy?: string[];
  keyword?: string;
  includeComments?: boolean;
}

export interface ZrClaimSearchResponse {
  items: ZrClaim[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ZrCreateClaimRequest {
  title: string;
  description: string;
  categoryId: string;
  parcelId: string;
}

export interface ZrClaimStateHistoryEntry {
  previousState?: ZrClaimState;
  newState: ZrClaimState;
  modifiedBy: { id: string; fullName: string };
  createdAt: string;
  comment?: string | null;
}

// ============================================================================
// Phase 2D: Webhooks
// ============================================================================

export interface ZrWebhookEndpoint {
  id: string;
  url: string;
  description?: string;
  eventTypes?: string[] | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ZrCreateWebhookRequest {
  url: string;
  description?: string;
  eventTypes?: string[] | null;
  headers?: Record<string, string>;
}

// ============================================================================
// User & Reseller types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'client';
  api_token: string | null;
  zr_tenant_id?: string | null;
  zr_api_key?: string | null;
  master_id?: string | null;
  markup_type?: 'flat' | 'percentage';
  markup_value?: number;
}

export interface ResellerParcel {
  id: string;
  profile_id: string;
  zr_parcel_id: string;
  tracking_number: string;
  cod_amount: number;
  zr_delivery_price: number;
  my_delivery_price: number;
  zr_return_price: number;
  state: string;
  delivered_at: string | null;
  settled?: boolean;
  payout_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  profile_id: string;
  type: 'delivery_fee' | 'return_fee' | 'deposit' | 'withdrawal' | 'adjustment' | 'payout';
  amount: number;
  ref_parcel_id: string | null;
  description: string | null;
  created_at: string;
}

// ============================================================================
// Financial System: Sub-account payouts
// ============================================================================

export interface SubAccountPayout {
  id: string;
  sub_account_id: string;
  master_id: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutParcel {
  id: string;
  payout_id: string;
  reseller_parcel_id: string;
  cod_amount: number;
  delivery_price: number;
  net_amount: number;
}

export interface SubAccountBalance {
  subAccountId: string;
  subAccountEmail: string;
  totalDelivered: number;
  totalCod: number;
  totalDeliveryFees: number;
  totalReturnFees: number;
  netBalance: number;
  pendingPayout: number;
  settledAmount: number;
  masterProfit: number;
}