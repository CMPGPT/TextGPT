import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
import { get_encoding } from 'tiktoken';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VectorDBConfig {
  embeddingModel?: string;
  similarityThreshold?: number;
  matchCount?: number;
}

// PDF chunk result including similarity score
interface PdfChunkMatch {
  id: number;
  product_id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * Count tokens for a text string using OpenAI's tiktoken library
 */
function countTokens(text: string): number {
  try {
    // Get the cl100k_base encoding which is used by text-embedding-3-small
    const enc = get_encoding("cl100k_base");
    // Encode the text and get token count
    const tokens = enc.encode(text);
    // Free the encoder to prevent memory leaks
    enc.free();
    // Return token count
    return tokens.length;
  } catch (error) {
    console.warn('Error counting tokens, falling back to character-based estimate:', error);
    // Fallback to an approximation
    return Math.ceil(text.length / 4);
  }
}

class VectorDBClient {
  private config: VectorDBConfig;
  
  constructor(config: VectorDBConfig = {}) {
    this.config = {
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      similarityThreshold: config.similarityThreshold || 0.5,
      matchCount: config.matchCount || 5
    };
    console.log('Vector DB client initialized with config:', this.config);
  }
  
  /**
   * Generate embedding for a text input
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: this.config.embeddingModel as string,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
  
  /**
   * Find similar PDF chunks for a query
   */
  async findSimilarPdfChunks(
    query: string,
    productId?: string,
    options?: {
      threshold?: number;
      count?: number;
    }
  ): Promise<PdfChunkMatch[]> {
    try {
      // Generate embedding for the query
      const embedding = await this.generateEmbedding(query);
      
      // Set search parameters
      const threshold = options?.threshold || this.config.similarityThreshold;
      const count = options?.count || this.config.matchCount;
      
      // Use the appropriate function based on whether a productId is provided
      const functionName = productId ? 'match_pdf_chunks_by_product' : 'match_pdf_chunks_all';
      
      // Perform similarity search using the appropriate RPC function
      const { data, error } = await supabaseAdmin.rpc(
        functionName,
        productId ? {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: count,
          p_product_id: productId
        } : {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: count
        }
      );
      
      if (error) {
        console.error(`Error searching for similar PDF chunks using ${functionName}:`, error);
        return [];
      }
      
      return data as PdfChunkMatch[];
    } catch (error) {
      console.error('Error in similarity search:', error);
      return [];
    }
  }
  
  /**
   * Store embeddings for PDF chunks
   */
  async storeEmbeddingsForPdfChunks(
    chunks: { content: string; productId: string; chunkHash?: string; metadata?: Record<string, any> }[]
  ): Promise<boolean> {
    try {
      for (const chunk of chunks) {
        // Generate embedding
        const embedding = await this.generateEmbedding(chunk.content);
        
        // Calculate hash if not provided
        const chunkHash = chunk.chunkHash || 
          Buffer.from(chunk.content.substring(0, 100)).toString('base64');
        
        // Count tokens properly
        const tokenCount = countTokens(chunk.content);
        
        // Store in database
        const { error } = await supabaseAdmin.from('pdf_chunks').insert({
          product_id: chunk.productId,
          chunk_hash: chunkHash,
          content: chunk.content,
          embedding: embedding,
          token_start: 0,
          token_end: tokenCount,
          metadata: chunk.metadata || null
        });
        
        if (error) {
          console.error('Error storing chunk embedding:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error storing embeddings:', error);
      return false;
    }
  }

  /**
   * Process chunks with null embeddings
   * Fetches and updates chunks that are missing embeddings
   */
  async processNullEmbeddings(batchSize = 10): Promise<boolean> {
    try {
      // Fetch chunks with null embeddings
      const { data: chunks, error } = await supabaseAdmin
        .from('pdf_chunks')
        .select('id, content, product_id, chunk_hash')
        .is('embedding', null)
        .limit(batchSize);

      if (error) {
        console.error('Error fetching chunks with null embeddings:', error);
        return false;
      }

      if (!chunks || chunks.length === 0) {
        console.log('No chunks with null embeddings found');
        return true;
      }

      console.log(`Processing ${chunks.length} chunks with null embeddings`);

      // Process each chunk
      for (const chunk of chunks) {
        try {
          // Generate embedding
          const embedding = await this.generateEmbedding(chunk.content);
          
          // Count tokens
          const tokenCount = countTokens(chunk.content);
          
          // Update the chunk with the embedding
          const { error: updateError } = await supabaseAdmin
            .from('pdf_chunks')
            .update({
              embedding: embedding,
              token_start: 0,
              token_end: tokenCount
            })
            .eq('id', chunk.id);
            
          if (updateError) {
            console.error(`Error updating chunk ${chunk.id}:`, updateError);
            continue;
          }
          
          console.log(`Updated chunk ${chunk.id} with embedding`);
        } catch (chunkError) {
          console.error(`Error processing chunk ${chunk.id}:`, chunkError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error processing null embeddings:', error);
      return false;
    }
  }
}

let vectorDBClient: VectorDBClient | null = null;

/**
 * Initialize vector DB with default config
 */
export function initVectorDB(config?: VectorDBConfig): VectorDBClient {
  vectorDBClient = new VectorDBClient(config);
  return vectorDBClient;
}

/**
 * Get existing vector DB client or create new one
 */
export function getVectorDBClient(): VectorDBClient | null {
  return vectorDBClient;
}

export { VectorDBClient, countTokens };
export type { VectorDBConfig, PdfChunkMatch }; 