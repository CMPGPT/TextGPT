import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../../types/supabase';

// This creates a Supabase client for server components using the cookies API
export const createClient = () => {
  return createServerComponentClient<Database>({ cookies });
}; 