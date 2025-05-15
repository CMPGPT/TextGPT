import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { processPdfToChunks } from '@/utils/mistralDocUtils';
import { countTokens } from '@/utils/vectorDB';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS() {
  console.log('OPTIONS request received for /api/iqr/scan');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Helper function to log errors and return a consistent response
function handleApiError(error: any, message: string, headers: any) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
  console.error(`${message}: ${errorMsg}`);
  console.error(`Stack trace: ${stackTrace}`);
  return NextResponse.json(
    { error: message, details: errorMsg },
    { status: 500, headers }
  );
}

export async function POST(request: NextRequest) {
  console.log('POST request received for /api/iqr/scan');
  
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Validate Supabase connection early
    if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
      console.error('Supabase client is not properly initialized');
      return NextResponse.json(
        { error: 'Database connection error', details: 'Supabase client initialization failed' },
        { status: 500, headers }
      );
    }

    // Validate OpenAI API key early
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY is not properly configured');
      return NextResponse.json(
        { error: 'AI service configuration error', details: 'Missing OpenAI API key' },
        { status: 500, headers }
      );
    }

    let formData;
    try {
      formData = await request.formData();
      console.log('Form data successfully parsed');
    } catch (error) {
      return handleApiError(error, 'Failed to parse form data', headers);
    }

    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    const productName = formData.get('productName') as string;
    const productDescription = formData.get('productDescription') as string;
    const systemPrompt = formData.get('systemPrompt') as string;

    console.log(`Received upload request for business: ${businessId}, product: ${productName}`);

    if (!file || !businessId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, businessId, productName' },
        { status: 400, headers }
      );
    }

    // Validate the file is a PDF
    if (!file.type.includes('pdf')) {
      console.log(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: 'Uploaded file must be a PDF' },
        { status: 400, headers }
      );
    }

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;
    console.log(`Generated product ID: ${productId}, QR tag: ${qrTextTag}`);

    // 1. Upload file to Supabase Storage
    let fileBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
      console.log(`Processing PDF ${file.name}, size: ${Math.round(fileBuffer.byteLength / 1024)} KB`);
    } catch (error) {
      return handleApiError(error, 'Failed to read file buffer', headers);
    }
    
    // Use a simpler approach for storage buckets to reduce potential issues
    const bucketName = 'iqr-pdfs';
    const filePath = `pdfs/${businessId}/${productId}/${file.name}`;
    
    console.log(`Attempting to use storage bucket: ${bucketName}`);
    
    // Skip the complex bucket creation and selection logic
    // Just try to upload to the predefined bucket directly
    
    let uploadError = null;
    let publicUrl = '';
    
    try {
      console.log(`Uploading file to ${bucketName}/${filePath}`);
      const { data: _uploadData, error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: true,
        });
      
      uploadError = error;
      
      if (!error) {
        console.log('File upload successful, getting public URL');
        const { data } = supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        publicUrl = data.publicUrl;
        console.log(`Generated public URL: ${publicUrl}`);
      } else {
        console.error(`Storage upload error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error during file upload:', error);
      uploadError = error;
    }

    if (uploadError) {
      console.log('Handling upload error gracefully');
      // Continue with a placeholder URL if upload fails
      publicUrl = `https://placeholder-for-failed-upload/${businessId}/${productId}/${encodeURIComponent(file.name)}`;
      console.log(`Using placeholder URL: ${publicUrl}`);
    }

    // 2. Create product entry regardless of upload success
    let productError = null;
    
    try {
      console.log('Creating product entry in database');
      const { error } = await supabaseAdmin
        .from('products')
        .insert({
          id: productId,
          business_id: businessId,
          name: productName,
          description: productDescription,
          system_prompt: systemPrompt,
          pdf_url: publicUrl,
          qr_text_tag: qrTextTag,
          status: uploadError ? 'error' : 'processing'
        });
      
      productError = error;
      
      if (error) {
        console.error(`Product creation error: ${error.message}`);
      } else {
        console.log(`Product created successfully with ID: ${productId}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      productError = error;
    }

    if (productError) {
      return NextResponse.json(
        { error: `Failed to create product: ${productError.message || 'Database error'}` },
        { status: 500, headers }
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

    console.log(`Generated chat URL: ${chatUrl}`);

    // 3. Create default QR code with dynamic URL
    let qrCreated = false;
    
    try {
      console.log('Creating QR code entry');
      const { error } = await supabaseAdmin
        .from('qr_codes')
        .insert({
          product_id: productId,
          image_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(chatUrl)}`,
          data: chatUrl
        });
      
      if (error) {
        console.warn(`Failed to create QR code: ${error.message}`);
      } else {
        console.log(`QR code created successfully for product: ${productId}`);
        qrCreated = true;
      }
    } catch (error) {
      console.error('Error creating QR code:', error);
    }

    // Always return a success response if we've made it this far
    console.log('Sending successful response to client');
    const response = NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      qrCreated,
      uploadSuccess: !uploadError,
      message: uploadError 
        ? 'Product created but file upload failed. PDF processing skipped.' 
        : 'Product created successfully. PDF processing has begun.'
    }, { headers });

    // Only process PDF if upload was successful
    if (!uploadError) {
      // Process PDF asynchronously
      (async () => {
        console.log('Starting asynchronous PDF processing');
        try {
          const pdfBuffer = Buffer.from(await file.arrayBuffer());
          
          try {
            // Try to process the PDF with Mistral
            const pdfChunks = await processPdfToChunks(pdfBuffer, file.name);
            console.log(`Processed PDF into ${pdfChunks.length} chunks`);
            
            if (pdfChunks.length === 0) {
              throw new Error('No chunks were extracted from the PDF');
            }
            
            let successfulChunks = 0;
            
            // Process chunks in batches to avoid memory issues
            const chunkBatches = [];
            const batchSize = 5; // Process 5 chunks at a time
            
            for (let i = 0; i < pdfChunks.length; i += batchSize) {
              chunkBatches.push(pdfChunks.slice(i, i + batchSize));
            }
            
            console.log(`Split processing into ${chunkBatches.length} batches`);
            
            for (let batchIndex = 0; batchIndex < chunkBatches.length; batchIndex++) {
              const batch = chunkBatches[batchIndex];
              console.log(`Processing batch ${batchIndex + 1}/${chunkBatches.length}`);
              
              for (const chunk of batch) {
                try {
                  // Check if OpenAI API key is available
                  if (!process.env.OPENAI_API_KEY) {
                    console.warn('OpenAI API key not available for embedding generation');
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
                    console.error(`Error storing chunk: ${insertError.message}`);
                    continue;
                  }
                  
                  successfulChunks++;
                } catch (embeddingError) {
                  console.error('Error generating embedding:', embeddingError);
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
                    console.error('Failed to store chunk without embedding:', insertError);
                  }
                }
              }
              
              // Small delay between batches to prevent overloading
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log(`Successfully stored ${successfulChunks} of ${pdfChunks.length} chunks`);
            
            // Update product status to ready
            await supabaseAdmin
              .from('products')
              .update({ status: 'ready' })
              .eq('id', productId);
              
            console.log(`PDF processing completed for product ${productId}`);
          } catch (pdfError: any) {
            console.error(`PDF processing error: ${pdfError.message}`);
            
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
              
              console.log('Stored error information as a chunk');
            } catch (embeddingError) {
              console.error('Error generating embedding for error message:', embeddingError);
            }
            
            // Update product status to indicate there was an issue
            await supabaseAdmin
              .from('products')
              .update({ status: 'error' })
              .eq('id', productId);
          }
        } catch (error) {
          console.error('Error in PDF processing:', error);
          // Update product status to failed if there's an error
          await supabaseAdmin
            .from('products')
            .update({ status: 'failed' })
            .eq('id', productId);
        }
      })().catch(error => {
        console.error('Unhandled error in PDF processing:', error);
      });
    }

    return response;
    
  } catch (error) {
    return handleApiError(error, 'An unexpected error occurred in scan API', headers);
  }
} 