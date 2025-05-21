import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../types/supabase';
import { cookies } from 'next/headers';
import { createClient as createServerClientJs } from '@supabase/supabase-js';

// This is a helper function to create a compatible client in both App Router and Pages Router
export const createClient = () => {
  // Check if we're in a Node.js environment (server-side)
  if (typeof window === 'undefined') {
    try {
      // Dynamically import cookies for App Router
      const getCookies = () => {
        try {
          // Use the imported cookies function
          return cookies();
        } catch (_e) {
          // If we're in Pages Router or another context without next/headers,
          // return a function that matches the behavior or handled in the catch block
          return null;
        }
      };

      const cookiesInstance = getCookies();
      
      // If we have cookies from next/headers, we're in an App Router context
      if (cookiesInstance) {
        return createServerComponentClient<Database>({ cookies: () => cookiesInstance });
      }
      
      // If we don't have cookies or we're in Pages Router, use request/response objects
      // Fallback for non-App Router context, but this requires passing req/res manually
      throw new Error('Server client should be created with supabaseServerForPages in pages/ directory');
    } catch (e) {
      console.error('Error creating Supabase client:', e);
      // Return a dummy client or handle the error as appropriate for your application
      throw new Error('Failed to create Supabase server client. If using in pages/ directory, use supabaseServerForPages instead.');
    }
  } else {
    // We're in a browser context, so we should use the client library instead
    throw new Error('Server client should not be used in client components. Use client.ts instead.');
  }
};

// For Pages Router (pages/ directory) - add this to your codebase
// Use this in API routes or getServerSideProps
export const supabaseServerForPages = (req: any, res: any) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Create a server client using the ssr module which is compatible with Pages Router
  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get: (name) => {
          const cookies = req.cookies;
          const cookie = cookies[name] ?? '';
          return cookie;
        },
        set: (name, value, options) => {
          res.setHeader('Set-Cookie', `${name}=${value}; Path=${options?.path ?? '/'}`);
        },
        remove: (name, options) => {
          res.setHeader('Set-Cookie', `${name}=; Path=${options?.path ?? '/'}; Max-Age=0`);
        },
      },
    }
  );
};

// Initialize the Supabase client with env variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable - falling back to anon key');
}

// Create a Supabase client for server operations
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createServerClientJs<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}; 