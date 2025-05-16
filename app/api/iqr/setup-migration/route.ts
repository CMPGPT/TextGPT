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

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
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

    // Add 'pending_processing' status to the products table enum if needed
    try {
      await supabaseAdmin.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace 
                        WHERE t.typname = 'product_status_enum') THEN
            CREATE TYPE product_status_enum AS ENUM ('draft', 'processing', 'ready', 'error', 'failed', 'pending_processing', 'queue_failed');
          ELSE 
            BEGIN
              ALTER TYPE product_status_enum ADD VALUE IF NOT EXISTS 'pending_processing';
              ALTER TYPE product_status_enum ADD VALUE IF NOT EXISTS 'queue_failed';
              EXCEPTION WHEN duplicate_object THEN NULL;
            END;
          END IF;
        END $$;
        
        -- Ensure products.status is using the enum type
        ALTER TABLE products 
          ALTER COLUMN status TYPE product_status_enum 
          USING status::product_status_enum;
      `);
      
      logger.info('Updated products table status enum');
    } catch (enumError) {
      logger.error('Failed to update product status enum', { 
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