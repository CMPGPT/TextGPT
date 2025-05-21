import { NextRequest, NextResponse } from 'next/server';
import { generateEmbeddingsWithTokenInfo } from '@/utils/pdf-direct-processing';
import { createClient } from '@supabase/supabase-js';

// Configure Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Only initialize supabase if we need it
// const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Use Node.js runtime for higher resource limits
export const runtime = 'nodejs';
// Increase timeout for processing large documents
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    console.log('[api:pdf-manual/embed] Processing embedding request');
    const body = await req.json();
    const { chunks, productId, chunkIds } = body;

    // We can either receive chunks directly or fetch them by extractedTextId
    if ((!chunks || !Array.isArray(chunks) || chunks.length === 0) && !chunkIds) {
      console.error('[api:pdf-manual/embed] No chunks provided or invalid format');
      return NextResponse.json({ success: false, error: 'No chunks provided or invalid format.' }, { status: 400 });
    }
    if (!productId) {
      console.error('[api:pdf-manual/embed] Missing product ID');
      return NextResponse.json({ success: false, error: 'Missing product ID.' }, { status: 400 });
    }

    // If we received chunk IDs instead of actual chunks, fetch them from the database
    const chunksToProcess = chunks;
    if (chunkIds && Array.isArray(chunkIds) && chunkIds.length > 0) {
      console.log(`[api:pdf-manual/embed] Fetching chunks by IDs (${chunkIds.length} chunks)`);
      // TODO: Implement fetching chunks by IDs if needed
    }

    console.log(`[api:pdf-manual/embed] Generating embeddings for ${chunksToProcess?.length || 0} chunks`);
    
    // Convert chunks to token-aware format if they're just strings
    // Define the type for chunk parameter
interface TokenChunk {
  content: string;
  tokenStart: number;
  tokenEnd: number;
  charStart: number;
  charEnd: number;
}

const chunkObjects = chunksToProcess?.map((chunk: string | TokenChunk | any, index: number) => {      // If chunk is already in the right format with token information, use it directly
      if (typeof chunk === 'object' && chunk !== null && 
          'content' in chunk && chunk.content && 
          'tokenStart' in chunk && 'tokenEnd' in chunk &&
          'charStart' in chunk && 'charEnd' in chunk) {
        return chunk as TokenChunk;
      }
      
      // Otherwise, create a basic structure with the content
      // Token positions will be approximated during embedding
      const chunkContent = chunk !== null && chunk !== undefined
        ? (typeof chunk === 'string' ? chunk : String(chunk))
        : '';
        
      return {
        content: chunkContent,
        tokenStart: index * 1000, // Approximate token positions
        tokenEnd: (index + 1) * 1000,
        charStart: 0,
        charEnd: typeof chunk === 'string' ? chunk.length : (chunkContent.length || 0)
      } as TokenChunk;
    }) || [];

    // Batch process chunks to avoid memory issues
    const BATCH_SIZE = 10;
    let processedCount = 0;
    let failedCount = 0;

    // Process in batches if there are many chunks
    if (chunkObjects.length > BATCH_SIZE) {
      console.log(`[api:pdf-manual/embed] Processing in batches of ${BATCH_SIZE}`);
      
      // Process batches sequentially
      for (let i = 0; i < chunkObjects.length; i += BATCH_SIZE) {
        const batchChunks = chunkObjects.slice(i, i + BATCH_SIZE);
        console.log(`[api:pdf-manual/embed] Processing batch ${i/BATCH_SIZE + 1}/${Math.ceil(chunkObjects.length/BATCH_SIZE)}`);
        
        try {
          const batchResult = await generateEmbeddingsWithTokenInfo(batchChunks, productId, {
            retries: 2, 
            updateProgress: async (stage, percent) => {
              // We could report progress to a database or other mechanism
              console.log(`[api:pdf-manual/embed] Progress: ${stage} ${percent}%`);
            }
          });
          
          processedCount += batchResult.chunkCount || 0;
          if (!batchResult.success) {
            failedCount += batchChunks.length;
            console.error(`[api:pdf-manual/embed] Batch embedding failed: ${batchResult.error}`);
          }
        } catch (batchError: any) {
          failedCount += batchChunks.length;
          console.error(`[api:pdf-manual/embed] Batch error: ${batchError.message}`);
        }
      }
      
      console.log(`[api:pdf-manual/embed] Completed processing all batches: ${processedCount} successful, ${failedCount} failed`);
      
      return NextResponse.json({
        success: processedCount > 0,
        chunkCount: processedCount,
        failedCount,
        message: failedCount > 0 ? `${failedCount} chunks failed embedding` : 'All embeddings generated successfully'
      });
    } else {
      // Process all chunks in one call if there aren't many
      const result = await generateEmbeddingsWithTokenInfo(chunkObjects, productId, {
        retries: 2,
        updateProgress: async (stage, percent) => {
          console.log(`[api:pdf-manual/embed] Progress: ${stage} ${percent}%`);
        }
      });
      console.log(`[api:pdf-manual/embed] Embedding completed: ${result.success ? 'success' : 'failed'}`);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error(`[api:pdf-manual/embed] Unhandled error: ${error.message}`);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}
