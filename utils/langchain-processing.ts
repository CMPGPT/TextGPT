import { RecursiveCharacterTextSplitter, TokenTextSplitter } from 'langchain/text_splitter';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Configure clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[utils:langchain-processing] Missing Supabase credentials', {
    supabaseUrlExists: !!supabaseUrl,
    supabaseKeyExists: !!supabaseKey
  });
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Splits text into chunks using LangChain's token-based splitter
 * This is more accurate and robust for handling tokens the way LLMs do
 */
export async function splitTextByTokens(
  text: string, 
  chunkSize: number = 1000, 
  overlap: number = 200
): Promise<string[]> {
  if (!text) return [];
  
  // Validate inputs
  chunkSize = Math.max(100, chunkSize);
  overlap = Math.min(Math.max(0, overlap), chunkSize - 50);
  
  console.log(`[utils:langchain-processing] Splitting text by tokens with size=${chunkSize}, overlap=${overlap}, totalLength=${text.length}`);
  
  try {
    // Create a token-based splitter - better for LLM context handling
    const splitter = new TokenTextSplitter({
      chunkSize,
      chunkOverlap: overlap,
      encodingName: 'cl100k_base', // OpenAI's encoding for GPT-4 and newer models
    });
    
    // Split the text
    const chunks = await splitter.splitText(text);
    
    console.log(`[utils:langchain-processing] Token splitting completed: ${chunks.length} chunks created`);
    return chunks;
  } catch (err: any) {
    console.error(`[utils:langchain-processing] Error during token splitting: ${err.message}`);
    
    // Fallback to character-based splitting if token splitting fails
    console.log('[utils:langchain-processing] Falling back to recursive character splitting');
    return splitTextByCharacters(text, chunkSize, overlap);
  }
}

/**
 * Fallback method: splits text into chunks using LangChain's recursive character text splitter
 * This handles document structure more intelligently than simple character slicing
 */
export async function splitTextByCharacters(
  text: string, 
  chunkSize: number = 1000, 
  overlap: number = 200
): Promise<string[]> {
  if (!text) return [];
  
  try {
    // Create a recursive character splitter which respects document structure
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: overlap,
      // Split preferentially on these separators in order
      separators: [
        "\n\n", // Paragraphs
        "\n",   // Line breaks
        ". ",   // Sentences
        ", ",   // Clauses
        " ",    // Words
        ""      // Characters
      ]
    });
    
    // This method actually returns a Promise in newer versions
    const chunks = await splitter.splitText(text);
    
    console.log(`[utils:langchain-processing] Character splitting completed: ${chunks.length} chunks created`);
    return chunks;
  } catch (err: any) {
    console.error(`[utils:langchain-processing] Error during character splitting: ${err.message}`);
    return [];
  }
}

/**
 * Generates embeddings for text chunks using OpenAI
 * Similar to the original but with better retry handling
 */
export async function generateEmbeddings(
  chunks: string[],
  productId: string,
  options?: { 
    retries?: number;
    updateProgress?: (stage: string, percent: number) => Promise<void>;
  }
): Promise<{ success: boolean; chunkCount?: number; error?: string }> {
  if (!chunks.length) {
    return { success: false, error: 'No chunks provided for embedding' };
  }
  
  const maxRetries = options?.retries || 3;
  let processedCount = 0;
  
  try {
    console.log(`[utils:langchain-processing] Generating embeddings for ${chunks.length} chunks`, { 
      productId,
      maxRetries
    });
    
    // Update progress if callback provided
    if (options?.updateProgress) {
      await options.updateProgress('embedding', 5); // Starting at 5%
    }
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate a unique hash for the chunk to avoid duplicates
      // Using crypto.subtle for better hash generation
      const encoder = new TextEncoder();
      const data = encoder.encode(chunk);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const chunkHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Generate embedding with exponential backoff retry
      let embedding = null;
      let retryCount = 0;
      let delay = 1000; // Start with 1s delay
      
      while (!embedding && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`[utils:langchain-processing] Retry ${retryCount}/${maxRetries} for chunk ${i}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          }
          
          const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: chunk,
            encoding_format: 'float'
          });
          
          embedding = response.data[0].embedding;
        } catch (embeddingError: any) {
          console.error(`[utils:langchain-processing] Embedding error: ${embeddingError.message}`);
          retryCount++;
        }
      }
      
      if (!embedding) {
        console.error(`[utils:langchain-processing] Failed to generate embedding after ${maxRetries} retries`);
        continue; // Skip this chunk but continue with others
      }
      
      // Store chunk and embedding in database
      const { error: insertError } = await supabase
        .from('pdf_chunks')
        .insert({
          product_id: productId,
          chunk_hash: chunkHash,
          content: chunk,
          embedding,
          metadata: { 
            chunk_index: i,
            total_chunks: chunks.length
          }
        });
      
      if (insertError) {
        console.error(`[utils:langchain-processing] Error storing chunk: ${insertError.message}`);
      } else {
        processedCount++;
      }
      
      // Update progress if callback provided
      if (options?.updateProgress) {
        const percent = Math.round((processedCount / chunks.length) * 95) + 5; // 5-100%
        await options.updateProgress('embedding', percent);
      }
    }
    
    console.log(`[utils:langchain-processing] Embeddings generated successfully`, {
      productId,
      processedChunks: processedCount,
      totalChunks: chunks.length
    });
    
    // Update product status to completed in Supabase
    await updateProductStatus(productId, 'completed');
    
    return {
      success: true,
      chunkCount: processedCount
    };
  } catch (err: any) {
    console.error(`[utils:langchain-processing] Embedding generation failed: ${err.message}`);
    await updateProductStatus(productId, 'failed');
    return {
      success: false,
      error: `Embedding generation failed: ${err.message}`,
      chunkCount: processedCount
    };
  }
}

/**
 * Updates the product status in the database
 */
async function updateProductStatus(
  productId: string,
  status: string,
  progressPercent?: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        pdf_processing_status: status,
        status: status === 'completed' ? 'ready' : 'processing'
      })
      .eq('id', productId);

    if (error) {
      console.error(`[utils:langchain-processing] Error updating product status: ${error.message}`);
    }
  } catch (err) {
    console.error(`[utils:langchain-processing] Failed to update product status: ${err}`);
  }
}
