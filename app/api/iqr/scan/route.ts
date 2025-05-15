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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    const productName = formData.get('productName') as string;
    const productDescription = formData.get('productDescription') as string;
    const systemPrompt = formData.get('systemPrompt') as string;

    if (!file || !businessId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, businessId, productName' },
        { status: 400 }
      );
    }

    // Validate the file is a PDF
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Uploaded file must be a PDF' },
        { status: 400 }
      );
    }

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;

    // 1. Upload file to Supabase Storage
    const filePath = `pdfs/${businessId}/${productId}/${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    console.log(`Processing PDF ${file.name}, size: ${Math.round(fileBuffer.byteLength / 1024)} KB`);
    
    // Check if bucket exists, if not try alternative bucket
    const { data: buckets } = await supabaseAdmin
      .storage
      .listBuckets();
    
    const bucketNames = buckets?.map((bucket: { name: string }) => bucket.name) || [];
    let bucketName = 'iqr_documents';
    
    if (!bucketNames.includes('iqr_documents')) {
      if (bucketNames.includes('iqr-pdfs')) {
        bucketName = 'iqr-pdfs';
      } else {
        // Create bucket if it doesn't exist
        try {
          await supabaseAdmin
            .from('storage.buckets')
            .insert({ id: 'iqr_documents', name: 'IQR PDF Documents' });
          console.log('Created bucket: iqr_documents');
        } catch (error) {
          console.error('Error creating bucket:', error);
        }
      }
    }
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload PDF: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log(`PDF uploaded successfully to ${bucketName}/${filePath}`);

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // 2. Create product entry
    const { error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        id: productId,
        business_id: businessId,
        name: productName,
        description: productDescription,
        system_prompt: systemPrompt,
        pdf_url: publicUrl,
        qr_text_tag: qrTextTag,
        status: 'processing'
      });

    if (productError) {
      return NextResponse.json(
        { error: `Failed to create product: ${productError.message}` },
        { status: 500 }
      );
    }

    console.log(`Product created successfully with ID: ${productId}`);

    // 3. Create default QR code
    const { error: qrError } = await supabaseAdmin
      .from('qr_codes')
      .insert({
        product_id: productId,
        image_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://textgpt.com/iqr/chat/${qrTextTag}`)}`,
        data: `https://textgpt.com/iqr/chat/${qrTextTag}`
      });

    if (qrError) {
      return NextResponse.json(
        { error: `Failed to create QR code: ${qrError.message}` },
        { status: 500 }
      );
    }

    console.log(`QR code created successfully for product: ${productId}`);

    // 4. Process PDF in the background
    // Use a response object to provide immediate feedback while processing happens
    const response = NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      message: 'Product created successfully. PDF processing has begun.'
    });

    // Process PDF asynchronously
    (async () => {
      try {
        console.log(`Starting PDF processing for ${file.name}, product ID: ${productId}`);
        
        // Use PDFRest to process the PDF
        const pdfBuffer = Buffer.from(await file.arrayBuffer());
        
        try {
          const pdfChunks = await processPdfToChunks(pdfBuffer, file.name);
          console.log(`Processed PDF into ${pdfChunks.length} chunks`);
          
          // Check if we have valid chunks
          if (pdfChunks.length === 0) {
            throw new Error('No chunks were extracted from the PDF');
          }
          
          let successfulChunks = 0;
          
          // Generate embeddings and store chunks
          for (const chunk of pdfChunks) {
            try {
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
              console.log(`Stored chunk with embedding: ${chunkHash.substring(0, 20)}...`);
            } catch (embeddingError) {
              console.error('Error generating embedding:', embeddingError);
              // Store chunk without embedding if there's an error
              const chunkHash = Buffer.from(chunk.content.substring(0, 100)).toString('base64');
              await supabaseAdmin.from('pdf_chunks').insert({
                product_id: productId,
                chunk_hash: chunkHash,
                content: chunk.content,
                token_start: 0,
                token_end: chunk.content.length,
                metadata: chunk.metadata
              });
            }
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
            // Generate embedding for the error message
            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: errorContent,
            });
            
            const errorChunkHash = Buffer.from(errorContent.substring(0, 100)).toString('base64');
            const tokenCount = countTokens(errorContent);
            
            // Store error chunk with embedding
            await supabaseAdmin.from('pdf_chunks').insert({
              product_id: productId,
              chunk_hash: errorChunkHash,
              content: errorContent,
              embedding: embeddingResponse.data[0].embedding,
              token_start: 0,
              token_end: tokenCount,
              metadata: { page: 0, section: 'Error' }
            });
            
            console.log('Stored error information as a chunk');
          } catch (embeddingError) {
            console.error('Error generating embedding for error message:', embeddingError);
            // Store without embedding
            await supabaseAdmin.from('pdf_chunks').insert({
              product_id: productId,
              chunk_hash: Buffer.from(errorContent.substring(0, 100)).toString('base64'),
              content: errorContent,
              token_start: 0,
              token_end: errorContent.length,
              metadata: { page: 0, section: 'Error' }
            });
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
    })();

    return response;
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 