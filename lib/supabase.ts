import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Function to create a client with error handling
const createSupabaseClient = (url?: string, key?: string) => {
  if (!url || !key) {
    console.error('Supabase URL or key is missing');
    // Return a minimal client that will throw proper errors when used
    return {
      from: () => {
        throw new Error('Supabase client is not properly initialized. Check your environment variables.');
      },
      auth: {
        signInWithPassword: () => {
          throw new Error('Supabase client is not properly initialized. Check your environment variables.');
        },
        signUp: () => {
          throw new Error('Supabase client is not properly initialized. Check your environment variables.');
        },
        signOut: () => {
          throw new Error('Supabase client is not properly initialized. Check your environment variables.');
        },
        getSession: () => {
          throw new Error('Supabase client is not properly initialized. Check your environment variables.');
        },
      },
    } as any;
  }
  return createClient(url, key);
};

// Create a Supabase client with the public anon key (for client-side usage)
export const supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase client with the service role key (for server-side usage)
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

export type Database = {
  public: {
    Tables: {
      personas: {
        Row: {
          id: string;
          name: string;
          short_desc: string | null;
          prompt: string;
          version: number;
        };
        Insert: {
          id?: string;
          name: string;
          short_desc?: string | null;
          prompt: string;
          version?: number;
        };
        Update: {
          id?: string;
          name?: string;
          short_desc?: string | null;
          prompt?: string;
          version?: number;
        };
      };
      users: {
        Row: {
          id: string;
          persona_id: string | null;
          name: string | null;
          age: number | null;
          occupation: string | null;
          hobby: string | null;
          created_at: string;
          is_deleted: boolean;
          business_id: string | null;
        };
        Insert: {
          id?: string;
          persona_id?: string | null;
          name?: string | null;
          age?: number | null;
          occupation?: string | null;
          hobby?: string | null;
          created_at?: string;
          is_deleted?: boolean;
          business_id?: string | null;
        };
        Update: {
          id?: string;
          persona_id?: string | null;
          name?: string | null;
          age?: number | null;
          occupation?: string | null;
          hobby?: string | null;
          created_at?: string;
          is_deleted?: boolean;
          business_id?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: number;
          user_id: string | null;
          role: string | null;
          content: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          role?: string | null;
          content?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          role?: string | null;
          content?: string | null;
          created_at?: string;
        };
      };
      logs: {
        Row: {
          id: number;
          level: string;
          message: string;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          level: string;
          message: string;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          level?: string;
          message?: string;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
    };
  };
}; 