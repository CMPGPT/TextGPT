import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { type SupabaseClientOptions } from '@supabase/supabase-js';

// This creates a Supabase client for server components using the cookies API
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon key is missing');
    throw new Error('Supabase environment variables are missing');
  }

  const cookieStore = cookies();
  
  return createSupabaseClient(
    supabaseUrl, 
    supabaseAnonKey, 
    {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: fetch.bind(globalThis),
      },
    } as SupabaseClientOptions<any>
  );
}; 