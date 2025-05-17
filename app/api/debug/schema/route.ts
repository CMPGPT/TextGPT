import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLogger } from '@/utils/logger';

const logger = getLogger('api:debug:schema');

// Utility function to fetch Supabase table info
async function getTableInfo(supabase: any, tableName: string) {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName);
    
    if (error) throw error;
    return { table: tableName, columns: data };
  } catch (error) {
    logger.error(`Error fetching table info for ${tableName}`, { error });
    return { table: tableName, error: 'Failed to fetch table info' };
  }
}

// Utility function to fetch constraint info
async function getConstraintInfo(supabase: any, tableName: string) {
  try {
    const { data, error } = await supabase.query(`
      SELECT con.conname AS constraint_name,
             con.contype AS constraint_type,
             pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = '${tableName}'
      AND nsp.nspname = 'public'
    `);
    
    if (error) throw error;
    return { table: tableName, constraints: data };
  } catch (error) {
    logger.error(`Error fetching constraint info for ${tableName}`, { error });
    return { table: tableName, error: 'Failed to fetch constraint info' };
  }
}

export async function GET(request: NextRequest) {
  logger.info('Schema debug request received');
  
  const supabase = supabaseAdmin;
  const tables = ['products', 'qr_codes', 'businesses', 'pdf_chunks', 'processing_queue'];
  
  try {
    const tableInfo = await Promise.all(tables.map(table => getTableInfo(supabase, table)));
    const constraintInfo = await Promise.all(tables.map(table => getConstraintInfo(supabase, table)));
    
    return NextResponse.json({
      message: 'Schema debug information',
      tables: tableInfo,
      constraints: constraintInfo,
      fixUrl: `${request.nextUrl.origin}/api/iqr/setup-migration`
    });
  } catch (error) {
    logger.error('Error in schema debug', { error });
    return NextResponse.json(
      { error: 'Failed to get schema information' },
      { status: 500 }
    );
  }
} 