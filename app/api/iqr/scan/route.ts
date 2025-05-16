import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { processPdfToChunks } from '@/utils/mistralDocUtils';
import { countTokens } from '@/utils/vectorDB';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('api:iqr:scan');

// Helper for memory usage tracking
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    return {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };
  }
  return { rss: 'n/a', heapTotal: 'n/a', heapUsed: 'n/a', external: 'n/a' };
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

// Add GET method to check API status (helpful for debugging)
export async function GET() {
  logger.info('GET request received');
  return NextResponse.json(
    { status: 'online', message: 'API is running' },
    { status: 200, headers: corsHeaders }
  );
}

// Helper function to log errors and return a consistent response
function handleApiError(error: any, message: string) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
  logger.error(message, { error: errorMsg, stack: stackTrace, memory: getMemoryUsage() });
  
  return NextResponse.json(
    { error: message, details: errorMsg },
    { status: 500, headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  logger.info('POST request received', { 
    contentType: request.headers.get('content-type'),
    memory: getMemoryUsage()
  });
  
  try {
    // Validate Supabase connection early
    if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
      logger.error('Supabase client initialization failed');
      return NextResponse.json(
        { error: 'Database connection error', details: 'Supabase client initialization failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Validate OpenAI API key early
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY is not properly configured');
      return NextResponse.json(
        { error: 'AI service configuration error', details: 'Missing OpenAI API key' },
        { status: 500, headers: corsHeaders }
      );
    }

    let formData;
    try {
      formData = await request.formData();
      logger.info('Form data successfully parsed');
    } catch (error) {
      return handleApiError(error, 'Failed to parse form data');
    }

    const file = formData.get('file') as File | null;
    const businessId = formData.get('businessId') as string;
    const productName = formData.get('productName') as string;
    const productDescription = formData.get('productDescription') as string;
    const systemPrompt = formData.get('systemPrompt') as string;
    const skipPdfCheck = formData.get('skipPdfCheck') === 'true';

    logger.info('Request parameters', { 
      businessId, 
      productName, 
      hasFile: !!file, 
      skipPdfCheck,
      fileType: file?.type,
      memory: getMemoryUsage()
    });

    if (!businessId || !productName) {
      logger.warn('Missing required fields', { businessId, productName });
      return NextResponse.json(
        { error: 'Missing required fields: businessId, productName' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for file only if skipPdfCheck is false
    if (!skipPdfCheck && !file) {
      logger.warn('Missing required file');
      return NextResponse.json(
        { error: 'Missing required file' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate the file is a PDF if it exists
    if (file && !file.type.includes('pdf') && !skipPdfCheck) {
      logger.warn(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: 'Uploaded file must be a PDF' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
    logger.info('Generated IDs', { productId, qrTextTag });

    // Variables for file processing
    let uploadError = null;
    let publicUrl = '';
    
    // Only process file upload if a file was provided
    if (file && !skipPdfCheck) {
      // 1. Upload file to Supabase Storage
      let fileBuffer;
      try {
        fileBuffer = await file.arrayBuffer();
        logger.info(`Processing PDF file`, { 
          name: file.name, 
          size: `${Math.round(fileBuffer.byteLength / 1024)}KB`,
          memory: getMemoryUsage()
        });
      } catch (error) {
        return handleApiError(error, 'Failed to read file buffer');
      }
      
      // Use a simpler approach for storage buckets to reduce potential issues
      const bucketName = 'iqr-pdfs';
      const filePath = `pdfs/${businessId}/${productId}/${file.name}`;
      
      logger.info(`Using storage bucket`, { bucketName, filePath });
      
      try {
        logger.info(`Uploading file`, { bucketName, filePath });
        const { data: _uploadData, error } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: true,
          });
        
        uploadError = error;
        
        if (!error) {
          logger.info('File upload successful');
          const { data } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filePath);
          
          publicUrl = data.publicUrl;
          logger.info(`Generated public URL`, { publicUrl });
        } else {
          logger.error(`Storage upload error`, { message: error.message });
        }
      } catch (error) {
        logger.error('Error during file upload', { error, memory: getMemoryUsage() });
        uploadError = error;
      }
    } else {
      logger.info('No file provided or PDF check skipped');
      publicUrl = `https://placeholder-for-no-upload/${businessId}/${productId}/no-file`;
    }

    // 2. Create product entry regardless of upload success
    let productError = null;
    
    try {
      logger.info('Creating product entry in database');
      const { error } = await supabaseAdmin
        .from('products')
        .insert({
          id: productId,
          business_id: businessId,
          name: productName,
          description: productDescription || null,
          system_prompt: systemPrompt || null,
          pdf_url: publicUrl || null,
          qr_text_tag: qrTextTag,
          status: !file || skipPdfCheck ? 'ready' : (uploadError ? 'error' : 'processing')
        });
      
      productError = error;
      
      if (error) {
        logger.error(`Product creation error`, { message: error.message });
      } else {
        logger.info(`Product created successfully`, { productId });
      }
    } catch (error) {
      logger.error('Error creating product', { error, memory: getMemoryUsage() });
      productError = error;
    }

    if (productError) {
      return NextResponse.json(
        { error: `Failed to create product: ${productError.message || 'Database error'}` },
        { status: 500, headers: corsHeaders }
      );
    }

    // Determine the base URL based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction 
      ? 'https://textg.pt' 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate the dynamic URL with product information and appropriate domain
    const encodedProductName = encodeURIComponent(productName);
    const chatUrl = `${baseUrl}/iqr/chat/${businessId}?sent=${encodedProductName}_describe`;

    logger.info(`Generated chat URL`, { chatUrl });

    // 3. Create default QR code with dynamic URL
    let qrCreated = false;
    
    try {
      logger.info('Creating QR code entry');
      const { error } = await supabaseAdmin
        .from('qr_codes')
        .insert({
          product_id: productId,
          image_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(chatUrl)}`,
          data: chatUrl
        });
      
      if (error) {
        logger.warn(`Failed to create QR code`, { error: error.message });
      } else {
        logger.info(`QR code created successfully`, { productId });
        qrCreated = true;
      }
    } catch (error) {
      logger.error('Error creating QR code', { error, memory: getMemoryUsage() });
    }

    // Always return a success response if we've made it this far
    logger.info('Sending successful response to client');
    const response = NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      qrCreated,
      uploadSuccess: !uploadError && !!file,
      skipPdfCheck: skipPdfCheck,
      message: !file || skipPdfCheck 
        ? 'Product created without PDF.' 
        : (uploadError 
          ? 'Product created but file upload failed. PDF processing skipped.' 
          : 'Product created successfully. PDF processing has begun.')
    }, { headers: corsHeaders });

    // Only process PDF if upload was successful and a file was provided
    if (!uploadError && file && !skipPdfCheck) {
      // Process PDF asynchronously
      (async () => {
        logger.info('Starting asynchronous PDF processing', { memory: getMemoryUsage() });
        try {
          const pdfBuffer = Buffer.from(await file.arrayBuffer());
          
          try {
            // Check available memory before PDF processing
            logger.info('Before PDF processing', { memory: getMemoryUsage() });
            
            // Try to process the PDF with Mistral
            const pdfChunks = await processPdfToChunks(pdfBuffer, file.name);
            logger.info(`Processed PDF into chunks`, { 
              count: pdfChunks.length,
              memory: getMemoryUsage()
            });
            
            if (pdfChunks.length === 0) {
              throw new Error('No chunks were extracted from the PDF');
            }
            
            let successfulChunks = 0;
            
            // Process chunks in batches to avoid memory issues
            const chunkBatches = [];
            const batchSize = 3; // Reduced from 5 to 3 to lower memory usage
            
            for (let i = 0; i < pdfChunks.length; i += batchSize) {
              chunkBatches.push(pdfChunks.slice(i, i + batchSize));
            }
            
            logger.info(`Split processing into batches`, { batchCount: chunkBatches.length });
            
            for (let batchIndex = 0; batchIndex < chunkBatches.length; batchIndex++) {
              const batch = chunkBatches[batchIndex];
              logger.info(`Processing batch`, { 
                batchIndex: batchIndex + 1, 
                totalBatches: chunkBatches.length,
                memory: getMemoryUsage() 
              });
              
              for (const chunk of batch) {
                try {
                  // Check if OpenAI API key is available
                  if (!process.env.OPENAI_API_KEY) {
                    logger.warn('OpenAI API key not available for embedding generation');
                    await supabaseAdmin.from('pdf_chunks').insert({
                      product_id: productId,
                      chunk_hash: Buffer.from(chunk.content.substring(0, 100)).toString('base64'),
                      content: chunk.content,
                      token_start: 0,
                      token_end: chunk.content.length,
                      metadata: chunk.metadata
                    });
                    continue;
                  }
                  
                  // Generate embedding using OpenAI
                  logger.info('Generating embedding', { 
                    contentLength: chunk.content.length,
                    memory: getMemoryUsage()
                  });
                  
                  const embeddingResponse = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: chunk.content,
                  });
                  
                  // Get the embedding vector
                  const embedding = embeddingResponse.data[0].embedding;
                  
                  // Calculate chunk hash
                  const chunkHash = Buffer.from(chunk.content.substring(0, 100)).toString('base64');
                  
                  // Count tokens properly
                  const tokenCount = countTokens(chunk.content);
                  
                  // Store chunk with embedding
                  logger.info('Storing chunk with embedding', { tokenCount });
                  const { error: insertError } = await supabaseAdmin.from('pdf_chunks').insert({
                    product_id: productId,
                    chunk_hash: chunkHash,
                    content: chunk.content,
                    embedding: embedding,
                    token_start: 0,
                    token_end: tokenCount,
                    metadata: chunk.metadata
                  });
                  
                  if (insertError) {
                    logger.error(`Error storing chunk`, { error: insertError.message });
                    continue;
                  }
                  
                  successfulChunks++;
                } catch (embeddingError) {
                  logger.error('Error generating embedding', { 
                    error: embeddingError,
                    memory: getMemoryUsage()
                  });
                  
                  // Store chunk without embedding if there's an error
                  try {
                    const chunkHash = Buffer.from(chunk.content.substring(0, 100)).toString('base64');
                    await supabaseAdmin.from('pdf_chunks').insert({
                      product_id: productId,
                      chunk_hash: chunkHash,
                      content: chunk.content,
                      token_start: 0,
                      token_end: chunk.content.length,
                      metadata: chunk.metadata
                    });
                  } catch (insertError) {
                    logger.error('Failed to store chunk without embedding', { error: insertError });
                  }
                }
              }
              
              // Increased delay between batches to prevent overloading
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Check memory usage after each batch
              logger.info('Memory after batch processing', { memory: getMemoryUsage() });
              
              // Try to force garbage collection if available (Node.js only)
              if (global.gc) {
                logger.info('Running garbage collection');
                global.gc();
              }
            }
            
            logger.info(`Chunk storage completed`, { 
              successfulChunks, 
              totalChunks: pdfChunks.length 
            });
            
            // Update product status to ready
            await supabaseAdmin
              .from('products')
              .update({ status: 'ready' })
              .eq('id', productId);
              
            logger.info(`PDF processing completed`, { productId, memory: getMemoryUsage() });
          } catch (pdfError: any) {
            logger.error(`PDF processing error`, { 
              error: pdfError.message,
              stack: pdfError.stack,
              memory: getMemoryUsage()
            });
            
            // Store a single error chunk
            const errorContent = `Unable to process PDF "${file.name}": ${pdfError.message || 'Unknown error'}`;
            
            try {
              if (process.env.OPENAI_API_KEY) {
                const embeddingResponse = await openai.embeddings.create({
                  model: "text-embedding-3-small",
                  input: errorContent,
                });
                
                const errorChunkHash = Buffer.from(errorContent.substring(0, 100)).toString('base64');
                const tokenCount = countTokens(errorContent);
                
                await supabaseAdmin.from('pdf_chunks').insert({
                  product_id: productId,
                  chunk_hash: errorChunkHash,
                  content: errorContent,
                  embedding: embeddingResponse.data[0].embedding,
                  token_start: 0,
                  token_end: tokenCount,
                  metadata: { page: 0, section: 'Error' }
                });
              } else {
                await supabaseAdmin.from('pdf_chunks').insert({
                  product_id: productId,
                  chunk_hash: Buffer.from(errorContent.substring(0, 100)).toString('base64'),
                  content: errorContent,
                  token_start: 0,
                  token_end: errorContent.length,
                  metadata: { page: 0, section: 'Error' }
                });
              }
              
              logger.info('Stored error information as a chunk');
            } catch (embeddingError) {
              logger.error('Error generating embedding for error message', { 
                error: embeddingError,
                memory: getMemoryUsage()
              });
            }
            
            // Update product status to indicate there was an issue
            await supabaseAdmin
              .from('products')
              .update({ status: 'error' })
              .eq('id', productId);
          }
        } catch (error) {
          logger.error('Error in PDF processing', { 
            error, 
            memory: getMemoryUsage() 
          });
          
          // Update product status to failed if there's an error
          await supabaseAdmin
            .from('products')
            .update({ status: 'failed' })
            .eq('id', productId);
        }
      })().catch(error => {
        logger.error('Unhandled error in PDF processing', { 
          error, 
          stack: error.stack,
          memory: getMemoryUsage()
        });
      });
    }

    return response;
    
  } catch (error) {
    return handleApiError(error, 'An unexpected error occurred in scan API');
  }
} 