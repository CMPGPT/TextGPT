import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

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

    // Generate unique IDs
    const productId = uuidv4();
    const qrTextTag = `iqr_${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-6)}`;

    // 1. Upload file to Supabase Storage
    const filePath = `pdfs/${businessId}/${productId}/${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
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

    // 3. For this implementation, we'll simulate text extraction and chunking
    // In a real implementation, you would use a library like pdf.js or a serverless function
    
    // 4. Create default QR code
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

    // Process PDF in the background (simulated for now)
    setTimeout(async () => {
      try {
        // Simulate chunks - in a real implementation, you would extract actual text from the PDF
        const sampleChunks = [
          {
            content: `Sample extracted text from ${file.name} - chunk 1. This would be actual content in a real implementation.`,
            metadata: { page: 1, section: 'Introduction' }
          },
          {
            content: `Sample extracted text from ${file.name} - chunk 2. This would be actual content in a real implementation.`,
            metadata: { page: 1, section: 'Features' }
          },
          {
            content: `Sample extracted text from ${file.name} - chunk 3. This would be actual content in a real implementation.`,
            metadata: { page: 2, section: 'Specifications' }
          },
        ];
        
        // Generate embeddings and store chunks
        for (const chunk of sampleChunks)
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
            
            // Import the token counting function
            const { countTokens } = await import('@/utils/vectorDB');
            
            // Count tokens properly
            const tokenCount = countTokens(chunk.content);
            
            // Store chunk with embedding
            await supabaseAdmin.from('pdf_chunks').insert({
              product_id: productId,
              chunk_hash: chunkHash,
              content: chunk.content,
              embedding: embedding,
              token_start: 0,
              token_end: tokenCount,
              metadata: chunk.metadata
            });
            
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
        
        // Update product status to ready
        await supabaseAdmin
          .from('products')
          .update({ status: 'ready' })
          .eq('id', productId);
          
      } catch (error) {
        console.error('Error in background processing:', error);
        // Update product status to failed if there's an error
        await supabaseAdmin
          .from('products')
          .update({ status: 'failed' })
          .eq('id', productId);
      }
    }, 5000);

    return NextResponse.json({
      success: true,
      productId,
      qrTextTag,
      message: 'Product created successfully. PDF processing has begun.'
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 