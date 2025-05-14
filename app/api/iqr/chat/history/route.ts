import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const anonymousId = searchParams.get('anonymousId');
    const businessId = searchParams.get('businessId');
    
    if (!anonymousId) {
      return NextResponse.json(
        { error: 'No anonymous ID provided' },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'No business ID provided' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('iqr_chat_messages')
      .select('*')
      .eq('business_id', businessId)
      .eq('user_phone', anonymousId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in chat history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const anonymousId = searchParams.get('anonymousId');
    const businessId = searchParams.get('businessId');
    
    if (!anonymousId) {
      return NextResponse.json(
        { error: 'No anonymous ID provided' },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'No business ID provided' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('iqr_chat_messages')
      .delete()
      .eq('business_id', businessId)
      .eq('user_phone', anonymousId);

    if (error) {
      console.error('Error clearing chat history:', error);
      return NextResponse.json(
        { error: 'Failed to clear chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete chat history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 