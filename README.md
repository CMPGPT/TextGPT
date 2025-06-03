# TextGPT

TextGPT is a platform that offers two main services:

1. **IQR (Intelligent QR Code)** - Generate QR codes linked to your content and enable chat interactions through them.
2. **Kiwi** - Property management service with QR-enabled interactions.

## Features

- User authentication and account management
- Subscription plans for different service tiers
- QR code generation and management
- Chat interfaces for user interactions
- SMS integration capabilities

## Environment Setup (Important for Deployment)

This application requires several environment variables to function correctly. For Vercel deployment, you must add these variables in the Vercel project settings.

### Critical Environment Variables

```
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/textgpt.git
cd textgpt

# Install dependencies
npm install
# or
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run the development server
npm run dev
# or
yarn dev
```

### Vercel Deployment

This project is configured for deployment on Vercel.

1. Connect your GitHub repository to Vercel
2. Configure the environment variables in Vercel project settings:
   - Go to your Vercel project dashboard
   - Navigate to "Settings" > "Environment Variables"
   - Add all the required environment variables listed above
3. Deploy the application

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

## Technology Stack

- Next.js 14+ for frontend and API routes
- Supabase for database and authentication
- OpenAI for chat functionality
- Stripe for subscription management
- TailwindCSS for styling
- Radix UI for accessible components

## Project Structure

- `/app`: Next.js App Router pages and API routes
- `/components`: Reusable React components
- `/lib`: Core libraries and API clients
- `/utils`: Utility functions
- `/styles`: Global styles and CSS modules
- `/public`: Static assets

## Security Notes

- Never commit sensitive API keys or environment variables to your repository
- Always use environment variables for sensitive information
- The Supabase service role key has admin privileges - keep it secure

## License

[MIT](LICENSE)

## Supabase Configuration for Authentication

To ensure proper authentication flow, configure your Supabase project with these settings:

1. Go to Authentication → URL Configuration:
   - Set your Site URL to your production URL
   - Add all relevant redirect URLs (localhost for development, your production domains)
   - Enable "Confirm email" option to send confirmation emails

2. Go to Authentication → Email Templates:
   - Customize your confirmation email template
   - Make sure the magic link URL matches your application's URL pattern

3. Authentication → User Management:
   - Enable "Email confirmations" 
   - Set your desired password policy

4. For handling the "Failed to create user profile" issue:
   - The application now handles partial registration success gracefully
   - If auth record is created but business details fail, users will still be redirected to the dashboard
   - Users can complete their profile later if needed

## PDF Processing Pipeline

The PDF processing flow has been centralized for better maintainability and feature expansion. Here's how it works:

### 1. PDF Upload

- PDFs are uploaded to Supabase Storage
- Files are validated for type (PDF only) and size (max 10MB)
- A unique path is generated based on context (product, business)
- The PDF URL is stored in the products table if applicable

### 2. Text Extraction

- The PDF URL is sent to Mistral AI's OCR API for text extraction
- The extracted text is temporarily stored for the next step
- Processing status is tracked in the products table

### 3. Text Chunking

- The extracted text is split into manageable chunks
- Chunking preserves semantic meaning where possible
- Different chunking strategies can be applied depending on content type

### 4. Embedding Generation

- Each chunk is sent to OpenAI to generate vector embeddings
- Embeddings are stored in the pdf_chunks table with metadata
- The chunks can be efficiently searched using vector similarity

### 5. Vector Search

- User queries are converted to embeddings and compared to stored chunks
- The most relevant chunks are retrieved to provide context for LLM responses
- Results can be filtered by business, product, or other criteria

## API Routes

- `/api/iqr/upload-pdf`: Handles PDF uploads only
- `/api/iqr/process-pdf`: Handles the full processing pipeline
- `/api/iqr/process-pdf/status`: Checks the status of PDF processing

## Database Schema

- `products` table has a `processing_status` column tracking the state of PDF processing
- `pdf_chunks` table stores the chunked text with embeddings for vector search

## Utility Functions

The centralized utilities are in `utils/pdf-processing.ts` and include:

- `validatePdfFile`: Validates file type and size
- `uploadPdfToStorage`: Uploads a PDF to Supabase Storage
- `extractTextFromPdf`: Extracts text from a PDF using Mistral AI's OCR API
- `chunkText`: Splits text into chunks for embedding
- `generateEmbeddings`: Generates embeddings for text chunks
- `processPdfEndToEnd`: Orchestrates the entire process

## Stripe Integration Setup

### Webhook Configuration

To ensure proper handling of subscription events, you need to configure Stripe webhooks correctly:

1. In your Stripe Dashboard, go to "Developers" > "Webhooks" 
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/iqr/stripe/webhooks`
4. For the events to listen to, add the following:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the webhook signing secret
6. Add the secret to your environment variables as `STRIPE_WEBHOOK_SECRET`

### Environment Variables

Make sure your project has the following Stripe-related environment variables:

```
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your publishable key
```

### Verifying Webhook Configuration

You can verify that webhook events are being received correctly by checking your application logs after attempting a subscription. You should see entries like:

```
[Stripe Webhook] Processing: checkout.session.completed
```

If you don't see these logs, verify that your webhook is correctly configured and that the signing secret matches.
