# PDF Processing with PDFRest

This document outlines how PDF processing is implemented in the TextGPT application using the PDFRest API.

## Overview

TextGPT uses PDFRest API for PDF text extraction, which offloads the compute-intensive task of parsing PDFs to an external service. The extracted text is then processed, chunked, and stored in the Supabase database with vector embeddings for efficient retrieval during chatbot conversations.

## Implementation Details

### Key Components

1. **PDF Extraction**: Using PDFRest API for text extraction
2. **Text Chunking**: Splitting extracted text into manageable chunks
3. **Vector Embeddings**: Generating embeddings using OpenAI's embedding model
4. **Storage**: Storing chunks and embeddings in Supabase for efficient retrieval

### Process Flow

1. User uploads a PDF through the UI
2. The PDF is stored in Supabase Storage
3. The API route processes the PDF asynchronously:
   - Extracts text using PDFRest API
   - Chunks the text into appropriate segments
   - Generates vector embeddings for each chunk
   - Stores chunks and embeddings in the database
4. The product status is updated to 'ready' when processing completes

### Key Files

- `utils/pdfRestUtils.ts`: Utilities for extracting text from PDFs using PDFRest
- `utils/pdfChunkUtils.ts`: Functions for splitting text into manageable chunks
- `utils/vectorDB.ts`: Vector database client for storing and retrieving embeddings
- `app/api/iqr/scan/route.ts`: API route that handles PDF upload and processing

## Configuration

The PDFRest API key is stored in the `.env.local` file:

```
PDFREST_API_KEY=your-api-key
```

## Error Handling

The implementation includes robust error handling:
- If text extraction fails, an error message is recorded
- If embedding generation fails, chunks are stored without embeddings for later processing
- Failed processes are marked in the product status

## Database Schema

Processed PDF chunks are stored in the `pdf_chunks` table with the following structure:

- `id`: Unique identifier
- `product_id`: Reference to the product
- `chunk_hash`: Hash of the chunk content for deduplication
- `content`: Actual text content
- `embedding`: Vector representation of the content
- `token_start`, `token_end`: Token positions for context
- `metadata`: Additional information like page numbers and sections 