import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { PricingItem, DeskItem, DeskStation, UserProfile } from '../types';
import { PRICING_DATA, DESK_DATA } from '../constants';

interface OperationResult {
    success: boolean;
    message?: string;
}

interface DataContextType {
  pricing: PricingItem[];
  desks: DeskItem[];
  flatStations: DeskStation[];
  users: UserProfile[]; // List of all users for admin
  loadingData: boolean;
  refreshData: () => Promise<void>;
  
  // DB Operations
  addPricing: (item: Omit<PricingItem, 'id'>) => Promise<OperationResult>;
  updatePricing: (id: number, item: Partial<PricingItem>) => Promise<OperationResult>;
  deletePricing: (id: number) => Promise<OperationResult>;
  
  addStation: (item: Omit<DeskStation, 'id'>) => Promise<OperationResult>;
  updateStation: (id: number, item: Partial<DeskStation>) => Promise<OperationResult>;
  deleteStation: (id: number) => Promise<OperationResult>;

  // Bulk Operations
  seedPricing: () => Promise<OperationResult>;
  seedStations: () => Promise<OperationResult>;

  // User Operations (Admin)
  refreshUsers: () => Promise<void>;
  updateUserToken: (userId: string, token: string) => Promise<OperationResult>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Initialise directly from static data — instant, no network wait
  const [pricing, setPricing] = useState<PricingItem[]>(PRICING_DATA);
  const [desks, setDesks] = useState<DeskItem[]>(DESK_DATA);
  const [flatStations, setFlatStations] = useState<DeskStation[]>(() => {
    const flat: DeskStation[] = [];
    DESK_DATA.forEach(d => d.stations.forEach(s => flat.push(s)));
    return flat;
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const organizeDesks = (stations: DeskStation[]): DeskItem[] => {
    const map = new Map<string, DeskStation[]>();
    stations.forEach(s => {
      // Map maps_url (DB snake_case) to mapsUrl (Frontend camelCase) if needed
      const normalized = { ...s, mapsUrl: s.maps_url || s.mapsUrl };
      if (!map.has(s.wilaya)) map.set(s.wilaya, []);
      map.get(s.wilaya)?.push(normalized);
    });
    
    const result: DeskItem[] = [];
    map.forEach((stations, wilaya) => result.push({ wilaya, stations }));
    return result.sort((a, b) => a.wilaya.localeCompare(b.wilaya));
  };

  const fetchPricingStations = async (): Promise<{ pricing: PricingItem[] | null; stations: DeskStation[] | null }> => {
    const [pricingRes, stationsRes] = await Promise.all([
      supabase.from('pricing').select('*').order('id', { ascending: true }),
      supabase.from('stations').select('*').order('id', { ascending: true }),
    ]);
    return {
      pricing: !pricingRes.error && pricingRes.data && pricingRes.data.length > 0 ? (pricingRes.data as PricingItem[]) : null,
      stations: !stationsRes.error && stationsRes.data && stationsRes.data.length > 0 ? (stationsRes.data as DeskStation[]) : null,
    };
  };

  const refreshData = async () => {
    const { pricing: dbPricing, stations: dbStations } = await fetchPricingStations();

    // Prefer the database when it has rows; fall back to the bundled constants otherwise.
    setPricing(dbPricing ?? PRICING_DATA);
    if (dbStations) {
      setFlatStations(dbStations);
      setDesks(organizeDesks(dbStations));
    } else {
      setDesks(DESK_DATA);
      const flat: DeskStation[] = [];
      DESK_DATA.forEach(d => d.stations.forEach(s => flat.push(s)));
      setFlatStations(flat);
    }

    // Auto-seed once on the first admin visit (requires the tables from
    // scripts/migration_pricing_stations.sql — until then the read errors above
    // and the constants fallback is used, matching previous behaviour).
    if (user?.role === 'admin') {
      let reseeded = false;
      if (!dbPricing && (await seedPricing()).success) reseeded = true;
      if (!dbStations && (await seedStations()).success) reseeded = true;
      // Surface the freshly seeded rows immediately
      if (reseeded) {
        const after = await fetchPricingStations();
        if (after.pricing) setPricing(after.pricing);
        if (after.stations) {
          setFlatStations(after.stations);
          setDesks(organizeDesks(after.stations));
        }
      }
    }
  };

  const refreshUsers = async () => {
      // Only works if the logged-in user has admin rights due to RLS policies
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) {
          setUsers(data as UserProfile[]);
      }
  };

  useEffect(() => {
    refreshData();
  }, [user?.id, user?.role]);

  // Populate the admin client list whenever an admin session is active. The
  // Command Center reads users from context; without this call it stays empty.
  useEffect(() => {
    if (user?.role === 'admin') refreshUsers();
  }, [user?.id, user?.role]);

  // --- DB Operations ---

  const addPricing = async (item: Omit<PricingItem, 'id'>): Promise<OperationResult> => {
    const { error } = await supabase.from('pricing').insert([item]);
    if (!error) {
        refreshData();
        return { success: true };
    }
    return { success: false, message: error.message };
  };

  const updatePricing = async (id: number, item: Partial<PricingItem>): Promise<OperationResult> => {
    const { error } = await supabase.from('pricing').update(item).eq('id', id);
    if (!error) {
        refreshData();
        return { success: true };
    }
    return { success: false, message: error.message };
  };

  const deletePricing = async (id: number): Promise<OperationResult> => {
    const { error } = await supabase.from('pricing').delete().eq('id', id);
    if (!error) {
        refreshData();
        return { success: true };
    }
    return { success: false, message: error.message };
  };

  const addStation = async (item: Omit<DeskStation, 'id'>): Promise<OperationResult> => {
    const dbItem = {
      wilaya: item.wilaya,
      name: item.name,
      address: item.address,
      phone: item.phone,
      maps_url: item.mapsUrl
    };
    const { error } = await supabase.from('stations').insert([dbItem]);
    if (!error) {
        refreshData();
        return { success: true };
    }
    return { success: false, message: error.message };
  };

  const updateStation = async (id: number, item: Partial<DeskStation>): Promise<OperationResult> => {
    const dbItem: any = { ...item };
    if (item.mapsUrl) {
        dbItem.maps_url = item.mapsUrl;
        delete dbItem.mapsUrl;
    }
    const { error } = await supabase.from('stations').update(dbItem).eq('id', id);
    if (!error) {
        refreshData();
        return { success: true };
    }
    return { success: false, message: error.message };
  };

  const deleteStation = async (id: number): Promise<OperationResult> => {
    const { error } = await supabase.from('stations').delete().eq('id', id);
    if (!error) {
        refreshData();
        return { success: true };
    }
    return { success: false, message: error.message };
  };

  // --- Bulk Operations ---
  const seedPricing = async (): Promise<OperationResult> => {
    try {
      const { error } = await supabase.from('pricing').insert(PRICING_DATA);
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const seedStations = async (): Promise<OperationResult> => {
    try {
      const stationsPayload = [];
      for (const group of DESK_DATA) {
          for (const s of group.stations) {
              stationsPayload.push({
                  wilaya: s.wilaya,
                  name: s.name,
                  address: s.address,
                  phone: s.phone,
                  maps_url: s.mapsUrl
              });
          }
      }
      const { error } = await supabase.from('stations').insert(stationsPayload);
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  // --- User Operations ---
  const updateUserToken = async (userId: string, token: string): Promise<OperationResult> => {
      const { error } = await supabase.from('profiles').update({ api_token: token }).eq('id', userId);
      if (!error) {
          refreshUsers();
          return { success: true };
      }
      return { success: false, message: "Failed to update user token" };
  };

  const value = useMemo(() => ({
    pricing, 
    desks, 
    flatStations,
    users,
    loadingData, 
    refreshData,
    refreshUsers,
    addPricing,
    updatePricing,
    deletePricing,
    addStation,
    updateStation,
    deleteStation,
    seedPricing,
    seedStations,
    updateUserToken
  }), [pricing, desks, flatStations, users, loadingData]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};