import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, pass: string, displayName: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data) {
        // Enforce amirmhmdglstan@gmail.com admin role in memory & DB
        let userRole: UserRole = data.role || 'user';
        if (currentUser.email?.toLowerCase() === 'amirmhmdglstan@gmail.com' && userRole !== 'admin') {
          userRole = 'admin';
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', currentUser.id);
        }
        setProfile({
          ...data,
          role: userRole,
        });
      } else {
        // Create profile fallback if trigger hasn't fired yet
        const defaultName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'کاربر جدید';
        const defaultUsername = currentUser.user_metadata?.username || (currentUser.email?.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6));
        const isAdminEmail = currentUser.email?.toLowerCase() === 'amirmhmdglstan@gmail.com';

        const newProfile: Profile = {
          id: currentUser.id,
          username: defaultUsername,
          display_name: defaultName,
          role: isAdminEmail ? 'admin' : 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: insertedData } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (insertedData) {
          setProfile(insertedData);
        } else {
          setProfile(newProfile);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    // Initial auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (!error) {
      toast.success('با موفقیت وارد شدید!');
    }
    return { error };
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string, username: string) => {
    const isAdminEmail = email.toLowerCase() === 'amirmhmdglstan@gmail.com';
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          display_name: displayName,
          username: username,
          role: isAdminEmail ? 'admin' : 'user',
        },
      },
    });

    if (!error && data.user) {
      toast.success('حساب کاربری شما با موفقیت ساخته شد!');
      await fetchProfile(data.user);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast.success('با موفقیت از حساب خارج شدید');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
