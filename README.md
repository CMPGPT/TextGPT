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
