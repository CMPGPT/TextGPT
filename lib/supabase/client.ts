'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../../types/supabase';

// For debugging environment variables
if (typeof window !== 'undefined') {
  console.log('Supabase URL from env:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const createClient = () => {
  // Use the createClientComponentClient without extra options that might interfere with auth
  return createClientComponentClient<Database>();
}; 