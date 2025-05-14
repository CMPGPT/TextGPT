import { getVectorDBClient, initVectorDB, PdfChunkMatch } from './vectorDB';

/**
 * Retrieves relevant PDF content based on a user query
 * 
 * @param query The user's question or query
 * @param productId Optional product ID to limit search to a specific product
 * @param options Configuration options for similarity search
 * @returns Array of matching PDF chunks with context
 */
export async function getRelevantPdfContext(
  query: string,
  productId?: string,
  options?: {
    threshold?: number;
    count?: number;
    formatForPrompt?: boolean;
  }
): Promise<string | PdfChunkMatch[]> {
  // Extract formatForPrompt option outside the try block so it's available in catch
  const formatForPrompt = options?.formatForPrompt || false;
  
  try {
    // Initialize vector DB if needed
    const vectorDB = getVectorDBClient() || initVectorDB();
    
    // Set default options
    const { threshold, count } = options || {};
    
    // Find relevant PDF chunks
    const matches = await vectorDB.findSimilarPdfChunks(query, productId, {
      threshold,
      count,
    });
    
    // Return raw matches if requested
    if (!formatForPrompt) {
      return matches;
    }
    
    // Format matches for inclusion in a prompt
    if (matches.length === 0) {
      return "No relevant information found in product documentation.";
    }
    
    // Format as context for prompt
    let contextText = "RELEVANT PRODUCT DOCUMENTATION:\n\n";
    
    matches.forEach((match, i) => {
      // Format metadata if available
      let metadataText = '';
      if (match.metadata) {
        const metadata = match.metadata as Record<string, any>;
        const metadataEntries = Object.entries(metadata)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${key}: ${value}`);
          
        if (metadataEntries.length > 0) {
          metadataText = ` | ${metadataEntries.join(', ')}`;
        }
      }
      
      contextText += `[Document ${i + 1}] (Relevance: ${Math.round(match.similarity * 100)}%${metadataText})\n${match.content}\n\n`;
    });
    
    return contextText;
  } catch (error) {
    console.error('Error getting PDF context:', error);
    return formatForPrompt ? "Error retrieving product information." : [];
  }
}

/**
 * Updates product embeddings in batch
 * 
 * @param productId The product ID
 * @param chunks Array of text chunks to process
 * @returns Success status
 */
export async function updateProductEmbeddings(
  productId: string,
  chunks: string[]
): Promise<boolean> {
  try {
    // Initialize vector DB if needed
    const vectorDB = getVectorDBClient() || initVectorDB();
    
    // Format chunks for processing
    const chunkObjects = chunks.map(content => ({
      content,
      productId
    }));
    
    // Store embeddings
    return await vectorDB.storeEmbeddingsForPdfChunks(chunkObjects);
  } catch (error) {
    console.error('Error updating product embeddings:', error);
    return false;
  }
} 