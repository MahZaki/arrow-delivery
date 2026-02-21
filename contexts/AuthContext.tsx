import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateApiToken: (token: string) => Promise<boolean>;
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
        const newProfile: UserProfile = { id: userId, email, role: 'client', api_token: null };
        setUser(newProfile);
        
        // Optional: Attempt to insert it if missing (lazy creation)
        await supabase.from('profiles').insert([{ id: userId, email, role: 'client' }]);
      } else {
        setUser(data as UserProfile);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
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
    
    // Create profile entry immediately
    if (data.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email, role: 'client' }]);
    }

    return { success: true };
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

  const value = useMemo(() => ({ 
    user,
    isAuthenticated: !!user, 
    isLoading,
    login,
    signup,
    logout,
    updateApiToken
  }), [user, isLoading]);

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