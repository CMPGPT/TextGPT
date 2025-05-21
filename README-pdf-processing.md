# PDF Processing Pipeline

This document describes the PDF processing pipeline implemented in the TextGPT application.

## Overview

The PDF processing pipeline consists of the following steps:

1. **Upload**: Upload PDF file to Supabase Storage
2. **Extract**: Extract text from the PDF using Mistral AI
3. **Store**: Store the raw extracted text in the database
4. **Chunk**: Chunk the text into smaller segments for processing
5. **Embed**: Generate embeddings for each chunk using OpenAI
6. **Store**: Store the chunks and embeddings in the database for RAG retrieval

## Implementation Details

### Storage

PDFs are stored in the `pdfs` bucket in Supabase Storage. The storage path follows this structure:
- `products/{productId}/{fileId}_{filename}` (for product-specific PDFs)
- `businesses/{businessId}/{fileId}_{filename}` (for business-specific PDFs)
- `uploads/{serviceType}/{fileId}_{filename}` (for general uploads)

### Database Schema

The following tables are used:

1. **products** - Contains product information including status of PDF processing
   - `pdf_url`: Public URL of the uploaded PDF
   - `pdf_path`: Storage path of the PDF
   - `pdf_processing_status`: Current status of processing ('pending', 'uploading', 'extracting', 'embedding', 'completed', 'failed')

2. **extracted_texts** - Stores the raw extracted text from PDFs
   - `product_id`: Reference to the product
   - `raw_text`: The full extracted text content
   - `source_url`: URL of the PDF source
   - `extraction_method`: Method used for extraction (e.g., 'mistral_ai')
   - `metadata`: Additional metadata about the extraction

3. **pdf_chunks** - Stores chunks of text with embeddings for RAG
   - `product_id`: Reference to the product
   - `chunk_hash`: Unique hash of the chunk content (for deduplication)
   - `content`: The chunk text content
   - `embedding`: Vector embedding of the chunk (pgvector format)
   - `metadata`: Additional metadata about the chunk

4. **processing_queue** - Tracks the status of processing jobs
   - `product_id`: Reference to the product being processed
   - `status`: Current status of the job
   - `stage`: Current processing stage
   - `processed_chunks`: Number of chunks processed
   - `total_chunks`: Total number of chunks to process
   - `progress_percent`: Percentage of processing completed

### API Endpoints

1. **/api/iqr/scan** - Creates a product and uploads a PDF file
2. **/api/iqr/process-pdf** - Processes a PDF file end-to-end
3. **/api/iqr/upload-pdf** - Uploads a PDF file to storage

### Utility Functions

The main processing logic is in `/utils/pdf-processing.ts`:

- `uploadPdfToStorage`: Uploads PDF to Supabase Storage
- `extractTextFromPdf`: Extracts text using Mistral AI
- `chunkText`: Chunks text into smaller segments
- `generateEmbeddings`: Generates embeddings using OpenAI
- `processPdfEndToEnd`: Orchestrates the entire process

### Dependencies

- [Supabase](https://supabase.com) - Storage and database
- [Mistral AI](https://mistral.ai) - Text extraction from PDFs
- [OpenAI](https://openai.com) - Embedding generation

## Configuration

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `MISTRAL_API_KEY` - Mistral AI API key
- `OPENAI_API_KEY` - OpenAI API key

## Usage

To process a PDF file:

```javascript
import { processPdfEndToEnd } from '@/utils/pdf-processing';

// Process a PDF file
const result = await processPdfEndToEnd(file, {
  productId: 'product-uuid',
  businessId: 'business-uuid',
  serviceType: 'product-pdf',
  chunkSize: 1000, // optional
  overlap: 200 // optional
});

if (result.success) {
  console.log('PDF processed successfully!', {
    fileUrl: result.fileUrl,
    status: result.status
  });
} else {
  console.error('PDF processing failed:', result.error);
}
```

## Error Handling

The pipeline includes comprehensive error handling:
- Each step tracks its own errors
- Failures are logged with detailed context
- Product and queue status is updated to reflect failures
- Failed jobs can be retried manually or automatically 