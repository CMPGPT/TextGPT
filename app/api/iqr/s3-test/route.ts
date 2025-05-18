import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/utils/logger';
import { S3Client } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '@/lib/supabase';

// Initialize logger
const logger = getLogger('api:iqr:s3-test');

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
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

export async function GET(_request: NextRequest) {
  logger.info('S3 test endpoint called');
  
  const results: any = {
    env_vars: {
      has_supabase_access_key: !!process.env.SUPABASE_ACCESS_KEY_ID,
      has_supabase_secret_key: !!process.env.SUPABASE_SECRET_ACCESS_KEY,
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    supabase_client: null,
    bucket_test: null,
    upload_test: null,
  };
  
  // Test 1: Check if we can initialize the S3 client
  try {
    const _s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.SUPABASE_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.SUPABASE_SECRET_ACCESS_KEY || '',
      }
    });
    
    results.s3_client = 'Initialized S3 client successfully';
  } catch (error) {
    results.s3_client = `Failed to initialize S3 client: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  // Test 2: Check if Supabase client is initialized correctly
  try {
    if (!supabaseAdmin) {
      results.supabase_client = 'Supabase admin client is null';
    } else if (typeof supabaseAdmin.from !== 'function') {
      results.supabase_client = 'Supabase admin client is initialized but missing from method';
    } else {
      results.supabase_client = 'Supabase admin client initialized successfully';
    }
  } catch (error) {
    results.supabase_client = `Error checking Supabase client: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  // Test 3: Check if the bucket exists
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      results.bucket_test = `Error listing buckets: ${error.message}`;
    } else {
      // Type for bucket
      interface Bucket {
        id: string;
        name: string;
        owner: string;
        created_at: string;
        updated_at: string;
        public: boolean;
      }
      
      const productPdfsBucket = buckets.find((bucket: Bucket) => bucket.name === 'product-pdfs');
      results.bucket_test = productPdfsBucket 
        ? 'Found product-pdfs bucket' 
        : 'product-pdfs bucket not found';
      results.buckets = buckets.map((b: Bucket) => b.name);
    }
  } catch (error) {
    results.bucket_test = `Error testing bucket: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  // Test 4: Try to upload a small test file
  try {
    const testContent = 'This is a test file for S3 upload verification';
    const testBuffer = Buffer.from(testContent);
    const testPath = `test/s3-test-${Date.now()}.txt`;
    
    const { data: _data, error } = await supabaseAdmin.storage
      .from('product-pdfs')
      .upload(testPath, testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });
      
    if (error) {
      results.upload_test = `Error uploading test file: ${error.message}`;
    } else {
      const { data: urlData } = supabaseAdmin.storage
        .from('product-pdfs')
        .getPublicUrl(testPath);
        
      results.upload_test = `Successfully uploaded test file and got URL: ${urlData.publicUrl}`;
      results.test_file_url = urlData.publicUrl;
    }
  } catch (error) {
    results.upload_test = `Error during upload test: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  logger.info('S3 test results', results);
  
  return NextResponse.json(results, { 
    status: 200,
    headers: corsHeaders 
  });
} 