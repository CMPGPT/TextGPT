import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  
  try {
    // Get the column definitions for the iqr_users table
    const { data: columns, error: columnsError } = await supabase
      .from('iqr_users')
      .select('*')
      .limit(0);
      
    if (columnsError) {
      return NextResponse.json(
        { error: 'Error fetching columns', details: columnsError },
        { status: 500 }
      );
    }
    
    // Get the table info from information_schema
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_definition', { table_name: 'iqr_users' });
      
    if (tableError) {
      return NextResponse.json(
        { 
          error: 'Error fetching table info', 
          details: tableError,
          columns: columns
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Schema information retrieved successfully',
      table_info: tableInfo,
      api_schema_columns: columns
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unexpected error', details: error },
      { status: 500 }
    );
  }
} 