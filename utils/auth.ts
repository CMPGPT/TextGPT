import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

// Create Supabase client
const createSupabaseClient = () => {
  return createClient();
};

// Function to sign in user
export const signIn = async (email: string, password: string) => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { user: null, error };
    }
    return { user: null, error: new Error('Unknown error occurred during sign in') };
  }
};

// Function to create new user
export const createUser = async (email: string, password: string) => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { user: null, error };
    }
    return { user: null, error: new Error('Unknown error occurred during user creation') };
  }
};

// Function to sign out user
export const logOut = async () => {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { error };
    }
    return { error: new Error('Unknown error occurred during sign out') };
  }
};

// Hook to get the current auth state and user role
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'business' | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const getCurrentUser = async () => {
      setLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Get user role from Supabase
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (userError) {
            console.error('Error fetching user role:', userError);
            setUserRole(null);
          } else if (userData) {
            setUserRole(userData.role as 'admin' | 'business' | null);
          } else {
            setUserRole(null);
          }
        } else {
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Call initially
    getCurrentUser();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        getCurrentUser(); // Refetch user data including role
      }
    );
    
    // Clean up the subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, userRole };
}; 