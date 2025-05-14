/**
 * Script to process null embeddings in the PDF chunks database
 * 
 * This script should be run to ensure all PDF chunks have embeddings
 * and token counts calculated correctly.
 * 
 * Usage:
 * npx tsx scripts/processEmbeddings.ts
 */

import { processAllNullEmbeddings } from '../utils/processNullEmbeddings';

async function main() {
  console.log('Starting PDF embeddings processing...');
  
  try {
    await processAllNullEmbeddings();
    console.log('Successfully processed PDF embeddings');
  } catch (error) {
    console.error('Error processing PDF embeddings:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 