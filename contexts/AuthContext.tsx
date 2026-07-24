import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, ZrCredentials } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMaster: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateApiToken: (token: string) => Promise<boolean>;
  updateZrCredentials: (tenantId: string, apiKey: string) => Promise<boolean>;
  updateCarrier: (carrier: 'ecotrack' | 'zrexpress') => Promise<boolean>;
  updateUserCarrier: (userId: string, carrier: 'ecotrack' | 'zrexpress') => Promise<boolean>;
  createSubAccount: (email: string, password: string, carrier: 'ecotrack' | 'zrexpress', markupType: 'flat' | 'percentage', markupValue: number) => Promise<{ success: boolean; error?: string }>;
  updateSubAccountMarkup: (subId: string, markupType: 'flat' | 'percentage', markupValue: number) => Promise<boolean>;
  resolveZrCredentials: () => Promise<ZrCredentials | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to fetch profile details
  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // If profile doesn't exist yet, we create a basic client profile object for state
        // In a real app, a Database Trigger usually creates this.
        console.warn("Profile not found in DB, using default client state.");
        const newProfile: UserProfile = { id: userId, email, role: 'client', carrier: 'ecotrack', api_token: null };
        setUser(newProfile);
        
        // Optional: Attempt to insert it if missing (lazy creation)
        await supabase.from('profiles').insert([{ id: userId, email, role: 'client', carrier: 'ecotrack' }]);
      } else {
        const profile = data as UserProfile;
        if (!profile.carrier) (profile as any).carrier = 'ecotrack';
        setUser(profile);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.email!);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if(!mounted) return;
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if(!mounted) return;
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => { 
        mounted = false; 
        subscription.unsubscribe(); 
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const signup = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    if (data.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email, role: 'client', carrier: 'ecotrack' }]);
    }

    return { success: true };
  };

  const isMaster = !!(user?.role === 'admin' && !user?.master_id);

  const resolveZrCredentials = useCallback(async (): Promise<ZrCredentials | null> => {
    if (!user) return null;

    if (user.zr_tenant_id && user.zr_api_key) {
      return { tenantId: user.zr_tenant_id, apiKey: user.zr_api_key };
    }

    if (user.master_id) {
      const { data: master } = await supabase
        .from('profiles')
        .select('zr_tenant_id, zr_api_key')
        .eq('id', user.master_id)
        .single();

      if (master?.zr_tenant_id && master?.zr_api_key) {
        return { tenantId: master.zr_tenant_id, apiKey: master.zr_api_key };
      }
    }

    return null;
  }, [user]);

  const createSubAccount = async (
    email: string, password: string,
    carrier: 'ecotrack' | 'zrexpress',
    markupType: 'flat' | 'percentage', markupValue: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isMaster) return { success: false, error: 'Only the master account can create sub-accounts.' };

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };

    if (data.user) {
      await supabase.from('profiles').insert([{
        id: data.user.id, email, role: 'client', carrier,
        master_id: user!.id,
        markup_type: markupType, markup_value: markupValue,
      }]);
    }
    return { success: true };
  };

  const updateSubAccountMarkup = async (
    subId: string,
    markupType: 'flat' | 'percentage', markupValue: number
  ): Promise<boolean> => {
    if (!isMaster) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ markup_type: markupType, markup_value: markupValue })
      .eq('id', subId);
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateApiToken = async (token: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase
      .from('profiles')
      .update({ api_token: token })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, api_token: token });
      return true;
    }
    return false;
  };

  const updateZrCredentials = async (tenantId: string, apiKey: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ zr_tenant_id: tenantId, zr_api_key: apiKey })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, zr_tenant_id: tenantId, zr_api_key: apiKey });
      return true;
    }
    return false;
  };

  const updateCarrier = async (carrier: 'ecotrack' | 'zrexpress'): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ carrier })
      .eq('id', user.id);
    if (!error) {
      setUser({ ...user, carrier });
      return true;
    }
    return false;
  };

  const updateUserCarrier = async (userId: string, carrier: 'ecotrack' | 'zrexpress'): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update({ carrier })
      .eq('id', userId);
    return !error;
  };

  const value = useMemo(() => ({ 
    user,
    isAuthenticated: !!user, 
    isLoading,
    isMaster,
    login,
    signup,
    logout,
    updateApiToken,
    updateZrCredentials,
    updateCarrier,
    updateUserCarrier,
    createSubAccount,
    updateSubAccountMarkup,
    resolveZrCredentials,
    refreshProfile,
  }), [user, isLoading, resolveZrCredentials]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};