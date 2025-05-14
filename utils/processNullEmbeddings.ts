import { initVectorDB } from './vectorDB';

/**
 * Processes all PDF chunks with null embeddings
 * This script can be run manually or on a schedule to ensure all chunks have embeddings
 */
export async function processAllNullEmbeddings(): Promise<void> {
  console.log('Starting to process PDF chunks with null embeddings...');
  
  // Initialize vector DB client
  const vectorDB = initVectorDB();
  
  let processedAll = false;
  let successCount = 0;
  let totalProcessed = 0;
  
  // Process in batches until no more null embeddings
  while (!processedAll) {
    const batchSize = 20; // Process 20 at a time
    const result = await vectorDB.processNullEmbeddings(batchSize);
    
    if (result) {
      successCount++;
    }
    
    totalProcessed += batchSize;
    
    // Check if we're done by running once more but with a smaller batch
    if (totalProcessed > 0 && successCount > 0) {
      const checkResult = await vectorDB.processNullEmbeddings(1);
      if (checkResult && !(await hasRemainingNullEmbeddings())) {
        processedAll = true;
      }
    }
    
    // Safety mechanism to avoid infinite loops
    if (totalProcessed > 1000) {
      console.log('Reached processing limit of 1000 chunks, stopping');
      break;
    }
  }
  
  console.log(`Finished processing null embeddings. Total processed: ${totalProcessed}`);
}

/**
 * Helper function to check if there are any remaining chunks with null embeddings
 */
async function hasRemainingNullEmbeddings(): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { count, error } = await supabaseAdmin
      .from('pdf_chunks')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null);
      
    if (error) {
      console.error('Error checking for null embeddings:', error);
      return true; // Assume there are still nulls if we can't check
    }
    
    return count > 0;
  } catch (error) {
    console.error('Error in hasRemainingNullEmbeddings:', error);
    return true; // Assume there are still nulls if we can't check
  }
}

// This allows running the script directly
if (typeof require !== 'undefined' && require.main === module) {
  processAllNullEmbeddings()
    .then(() => console.log('Script completed successfully'))
    .catch(error => console.error('Script failed:', error));
} 