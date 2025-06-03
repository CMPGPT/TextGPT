# PDF Processing Pipeline

This document describes the PDF processing pipeline used in the application.

## Steps

The PDF processing pipeline consists of several steps:

1. **Upload**: Upload PDF file to Supabase Storage
2. **Extract**: Extract text from the PDF using Mistral AI's OCR API
3. **Store**: Store the raw extracted text in the database
4. **Chunk**: Chunk the text into smaller segments for processing
5. **Embed**: Generate embeddings for each chunk
6. **Store**: Store the embeddings in the database for searching

## Functions

The pipeline uses these key functions:

- `uploadPdfToStorage`: Uploads PDF to Supabase Storage
- `extractTextFromPdf`: Extracts text using Mistral AI's OCR API
- `chunkText`: Chunks text into smaller segments
- `generateEmbeddings`: Generates embeddings using OpenAI

## Technologies

- [Supabase](https://supabase.com) - Storage and database
- [Mistral AI](https://mistral.ai) - Text extraction from PDFs using their OCR API
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