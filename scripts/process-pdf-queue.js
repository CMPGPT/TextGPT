#!/usr/bin/env node

/**
 * PDF Processing Queue Worker
 * 
 * This script processes queued PDF files from the processing_queue table.
 * It can be run manually or scheduled as a cron job.
 * 
 * Usage:
 * node process-pdf-queue.js [--limit=5] [--delay=1000]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Parse arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.slice(2)] = value !== undefined ? value : true;
  }
  return acc;
}, {});

// Configuration
const LIMIT = parseInt(args.limit || '5', 10);
const DELAY_BETWEEN_ITEMS = parseInt(args.delay || '1000', 10);
const MAX_RUNTIME_MS = parseInt(args.maxRuntime || '290000', 10); // Default to just under 5 minutes

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Base URL configuration
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://textg.pt'
  : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Start time to track runtime
const startTime = Date.now();

/**
 * Process a single queued item
 */
async function processQueueItem(item) {
  console.log(`Processing queue item for product ${item.product_id}`);
  
  try {
    // Call the process-pdf API
    const response = await fetch(`${baseUrl}/api/iqr/process-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: item.product_id,
        filePath: item.file_path,
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${text}`);
    }
    
    const result = await response.json();
    console.log(`Processing complete for product ${item.product_id}:`, result);
    return true;
  } catch (error) {
    console.error(`Error processing queue item for product ${item.product_id}:`, error);
    
    // Update the queue item to show the error
    await supabase
      .from('processing_queue')
      .update({
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    
    // Also update the product status
    await supabase
      .from('products')
      .update({ status: 'error' })
      .eq('id', item.product_id);
    
    return false;
  }
}

/**
 * Get the next batch of queued items
 */
async function getQueuedItems() {
  const { data, error } = await supabase
    .from('processing_queue')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  
  if (error) {
    console.error('Error fetching queued items:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Main function to process queue
 */
async function processQueue() {
  console.log(`Starting PDF processing queue with limit ${LIMIT}`);
  
  try {
    const items = await getQueuedItems();
    
    if (items.length === 0) {
      console.log('No items in queue to process');
      return;
    }
    
    console.log(`Found ${items.length} items to process`);
    
    // Process items one by one
    for (const item of items) {
      // Check if we've exceeded our runtime limit
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`Reached maximum runtime of ${MAX_RUNTIME_MS}ms, exiting`);
        break;
      }
      
      await processQueueItem(item);
      
      // Add delay between items
      if (DELAY_BETWEEN_ITEMS > 0) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
      }
    }
    
    console.log('Queue processing complete');
  } catch (error) {
    console.error('Error processing queue:', error);
    process.exit(1);
  }
}

// Run the queue processor
processQueue()
  .then(() => {
    console.log(`PDF processing queue completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in queue processor:', error);
    process.exit(1);
  }); 