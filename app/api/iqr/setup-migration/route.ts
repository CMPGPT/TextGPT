import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('api:iqr:setup-migration');

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  logger.info('OPTIONS request received');
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Add GET method to run the migration
export async function GET() {
  logger.info('GET request received for migration setup');
  try {
    // Run the same migration logic as the POST handler
    if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
      logger.error('Supabase client initialization failed');
      return NextResponse.json(
        { error: 'Database connection error.', details: 'Supabase client initialization failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create or check for the processing_queue table
    try {
      await supabaseAdmin.query(`
        CREATE TABLE IF NOT EXISTS processing_queue (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          product_id UUID REFERENCES products(id),
          status TEXT NOT NULL DEFAULT 'queued',
          file_path TEXT,
          process_start TIMESTAMP WITH TIME ZONE,
          process_end TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          error TEXT
        );
      `);
      
      logger.info('Created or verified processing_queue table');
    } catch (tableError) {
      logger.error('Failed to create processing_queue table', { 
        error: tableError instanceof Error ? tableError.message : String(tableError) 
      });
      return NextResponse.json(
        { error: 'Failed to create processing queue table', details: tableError instanceof Error ? tableError.message : String(tableError) },
        { status: 500, headers: corsHeaders }
      );
    }
  
    // Update products.status check constraint to include the new status values
    try {
      await supabaseAdmin.query(`
        -- First drop the existing check constraint
        ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
        
        -- Then add a new check constraint with all the needed values
        ALTER TABLE products ADD CONSTRAINT products_status_check 
          CHECK (status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text, 'error'::text, 'pending_processing'::text, 'queue_failed'::text]));
      `);
      
      logger.info('Updated products table status check constraint');
    } catch (enumError) {
      logger.error('Failed to update product status check constraint', { 
        error: enumError instanceof Error ? enumError.message : String(enumError) 
      });
      // Continue as this might be a permissions issue but the table still works
    }

    return NextResponse.json(
      { success: true, message: 'Migration setup completed successfully' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Error in migration setup', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to set up migration', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST handler to run the migration
export async function POST(request: NextRequest) {
  try {
    // Check for admin key in request
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('admin_key');

    // Verify the admin key
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    logger.info('Starting migration setup');

    // Create processing_queue table if it doesn't exist
    const { error: tableError } = await supabaseAdmin.rpc('create_processing_queue_table');

    if (tableError) {
      // If RPC doesn't exist, create the table directly
      logger.warn('RPC not found, creating table directly', { error: tableError.message });
      
      const { error: createError } = await supabaseAdmin.query(`
        CREATE TABLE IF NOT EXISTS processing_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          product_id UUID NOT NULL REFERENCES products(id),
          status TEXT NOT NULL DEFAULT 'queued',
          file_path TEXT NOT NULL,
          error TEXT,
          processed_chunks INTEGER,
          total_chunks INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_processing_queue_product_id ON processing_queue (product_id);
        CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue (status);
      `);

      if (createError) {
        logger.error('Failed to create processing_queue table', { error: createError.message });
        return NextResponse.json(
          { error: 'Failed to create processing_queue table', details: createError.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Update products.status check constraint to include the new status values
    try {
      await supabaseAdmin.query(`
        -- First drop the existing check constraint
        ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
        
        -- Then add a new check constraint with all the needed values
        ALTER TABLE products ADD CONSTRAINT products_status_check 
          CHECK (status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text, 'error'::text, 'pending_processing'::text, 'queue_failed'::text]));
      `);
      
      logger.info('Updated products table status check constraint');
    } catch (enumError) {
      logger.error('Failed to update product status check constraint', { 
        error: enumError instanceof Error ? enumError.message : String(enumError) 
      });
      // Continue as this might be a permissions issue but the table still works
    }

    return NextResponse.json(
      { success: true, message: 'Migration setup completed successfully' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Error in migration setup', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to set up migration', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
} 