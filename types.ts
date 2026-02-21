
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
  domicile: number;
  stop: number;
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

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'client';
  api_token: string | null;
}