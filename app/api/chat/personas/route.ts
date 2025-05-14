import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic';

// Helper function to verify Supabase configuration
const verifySupabaseConfig = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing. Please check environment variables.');
  }
};

export async function GET(req: NextRequest) {
  try {
    // Verify Supabase configuration before proceeding
    verifySupabaseConfig();
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    console.log(`[PERSONAS] Fetching personas for user: ${userId}`);
    
    // Get all personas
    const { data: personas, error } = await supabaseAdmin
      .from('personas')
      .select('id, name, short_desc');
    
    if (error) {
      console.log(`[PERSONAS] Error fetching personas: ${error.message}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch personas' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // If we have a userId, mark the active persona and fetch user data
    if (userId) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('persona_id, name, age, occupation, hobby')
        .eq('id', userId)
        .single();
      
      console.log(`[PERSONAS] User data retrieved: ${JSON.stringify(user || {})}`);
      
      if (user) {
        // Mark the active persona
        const personasWithActive = personas.map((persona: { id: string; name: string; short_desc: string }) => ({
          ...persona,
          active: persona.id === user.persona_id,
        }));
        
        console.log(`[PERSONAS] Active persona found: ${user.persona_id}`);
        
        return new Response(JSON.stringify(personasWithActive), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }
    
    console.log(`[PERSONAS] No user found or no user ID provided`);
    // Return personas without active flag if no user is found
    return new Response(JSON.stringify(personas.map((p: { id: string; name: string; short_desc: string }) => ({ ...p, active: false }))), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error(`[PERSONAS] Error in personas route: ${error.message}`, error);
    return new Response(JSON.stringify({ error: 'An error occurred fetching personas' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 