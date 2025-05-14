import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No business ID provided' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, system_prompt, status')
      .eq('business_id', businessId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // If no products were found, return a default product for development
    if (!data || data.length === 0) {
      // Use the test business ID for development
      if (businessId === '11111111-1111-1111-1111-111111111111') {
        return NextResponse.json([{
          id: '8816aad6-ad51-42fa-bd7b-86d9b1b5820e',
          name: 'OG kush',
          description: 'this is good',
          system_prompt: 'act as badass',
          status: 'ready'
        }]);
      }
      return NextResponse.json([]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 