# TextGPT

TextGPT is a platform offering two AI-powered services:

1. **IQR Code** - Interactive QR codes with context-aware AI chat capabilities
2. **KIWI** - Smart QR code solution for property and asset management

## Features

- Authentication system with user registration and login
- Subscription management with different pricing plans
- QR code generation for both services
- PDF/context upload for AI training
- Chat interfaces for interacting with AI through SMS/messaging
- Dashboard with analytics for both services

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API routes and Server Actions
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Vector Storage**: Pinecone
- **Messaging**: Telnyx SMS
- **Payments**: Stripe
- **AI**: OpenAI

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables in `.env.local`
4. Run development server with `npm run dev`
5. Build for production with `npm run build`

## Deployment

This project is designed to be deployed on Vercel.

## Project Structure

- `/pages`: Next.js pages and API routes
- `/components`: Reusable React components
- `/utils`: Utility functions and API clients
- `/styles`: Global styles and CSS modules
- `/public`: Static assets

## License

[MIT](LICENSE)
