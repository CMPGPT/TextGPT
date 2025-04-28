# TextGPT

TextGPT is a platform that offers two main services:

1. **IQR (Intelligent QR Code)** - Generate QR codes linked to your content and enable chat interactions through them.
2. **Kiwi** - Property management service with QR-enabled interactions.

## Features

- User authentication and account management
- Subscription plans for different service tiers
- PDF and content upload functionality
- QR code generation and management
- Chat interfaces for user interactions
- SMS integration capabilities

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

### Deployment

This project is configured for deployment on Vercel.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel
```

## Technology Stack

- Next.js for frontend and API routes
- Firebase for authentication and database
- Pinecone for vector database
- Stripe for subscription management
- OpenAI for chat functionality
- Telnyx for SMS services (future implementation)

## Project Structure

- `/pages`: Next.js pages and API routes
- `/components`: Reusable React components
- `/utils`: Utility functions and API clients
- `/styles`: Global styles and CSS modules
- `/public`: Static assets

## License

[MIT](LICENSE)
