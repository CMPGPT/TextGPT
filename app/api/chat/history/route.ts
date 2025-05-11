import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic';

// Define type for chat message
type ChatMessage = {
  id: number;
  user_id: string | null;
  role: string | null;
  content: string | null;
  created_at: string;
};

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
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const includeFunctions = url.searchParams.get('includeFunctions') === 'true';
    
    console.log(`[HISTORY] Fetching chat history for user: ${userId}, limit: ${limit}`);
    
    if (!userId) {
      console.log(`[HISTORY] Error: User ID is required`);
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Get the user's chat history
    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId);
      
    // By default, filter out function messages
    if (!includeFunctions) {
      query = query.not('role', 'eq', 'function');
    }
    
    console.log(`[HISTORY] Query parameters: user_id=${userId}, includeFunctions=${includeFunctions}`);
    
    const { data: messages, error } = await query
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.log(`[HISTORY] Error fetching chat history: ${error.message}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch chat history' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    console.log(`[HISTORY] Retrieved ${messages?.length || 0} messages for user: ${userId}`);
    if (messages?.length > 0) {
      console.log(`[HISTORY] Message roles:`, messages.map((m: ChatMessage) => m.role));
    }
    
    return new Response(JSON.stringify(messages), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error(`[HISTORY] Error in chat history route:`, error);
    return new Response(JSON.stringify({ error: 'An error occurred fetching chat history' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Verify Supabase configuration before proceeding
    verifySupabaseConfig();
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    console.log(`[HISTORY] Deleting chat history for user: ${userId}`);
    
    if (!userId) {
      console.log(`[HISTORY] Error: User ID is required for delete`);
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Delete all chat messages for this user
    const { error, count } = await supabaseAdmin
      .from('chat_messages')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    
    if (error) {
      console.log(`[HISTORY] Error deleting chat history: ${error.message}`);
      return new Response(JSON.stringify({ error: 'Failed to clear chat history' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    console.log(`[HISTORY] Successfully deleted ${count} messages for user: ${userId}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Chat history cleared successfully',
      count
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error(`[HISTORY] Error in clear chat history route:`, error);
    return new Response(JSON.stringify({ error: 'An error occurred clearing chat history' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 