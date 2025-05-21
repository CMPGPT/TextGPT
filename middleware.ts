import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Protected routes that require subscription
const PROTECTED_ROUTES = [
  '/iqr/dashboard', 
  '/iqr/upload',
  '/iqr/chat',
  '/iqr/manual-pdf-processing',
  '/iqr/qrcodes',
];

// Pages that should redirect logged-in users
const AUTH_PAGES = [
  '/iqr/login',
  '/iqr/signup',
  '/iqr/forgot-password',
];

// Pages that are always accessible without authentication
const PUBLIC_ROUTES = [
  '/',
  '/iqr/landing',
  '/iqr-subscription',
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/terms',
  '/privacy',
  '/icons/',
  '/coming-soon',
  '/subscription/plans',
  '/subscription/success',
];

// Enhanced logging function
function log(...args: any[]) {
  console.log(`[Middleware][${new Date().toISOString()}]`, ...args);
}

export async function middleware(request: NextRequest) {
  try {
    // Get the pathname from the URL
    const { pathname } = request.nextUrl;
    
    log(`Processing request for: ${pathname}, Method: ${request.method}`);
    
    // Special handling for OPTIONS requests to API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      log(`Handling OPTIONS request for API route: ${pathname}`);
      
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // Check if it's a public route that should always be accessible
    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))) {
      return NextResponse.next();
    }
    
    // Add CORS headers for API routes
    if (pathname.startsWith('/api/')) {
      log(`Middleware detected API request: ${pathname}, Method: ${request.method}`);
      
      // For API routes, add CORS headers and pass through
      const response = NextResponse.next();
      
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
      
      return response;
    }
    
    // Handle auth routes - when accessing /auth/* redirect to IQR equivalents
    if (pathname.startsWith('/auth/')) {
      log(`Redirecting from legacy auth route: ${pathname}`);
      const newPath = pathname.replace('/auth/', '/iqr/');
      return NextResponse.redirect(new URL(newPath, request.url));
    }
    
    // Create a Supabase client for the middleware
    const supabase = createClient();
    
    // Get the auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      log(`Session error: ${sessionError.message}`);
    }
    
    log(`Session state for ${pathname}: ${session ? 'Authenticated' : 'Unauthenticated'}`);
    
    // If user is signed in and tries to access login/signup pages, redirect to dashboard
    if (session && AUTH_PAGES.some(page => pathname.startsWith(page))) {
      log(`Redirecting authenticated user from ${pathname} to dashboard`);
      return NextResponse.redirect(new URL('/iqr/dashboard', request.url));
    }

    // If not logged in and not on a public or auth route, redirect to login
    if (!session && !AUTH_PAGES.some(page => pathname.startsWith(page)) && 
        !PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))) {
      log(`Redirecting unauthenticated user from ${pathname} to login`);
      const redirectUrl = new URL('/iqr/login', request.url);
      // Add a redirect parameter to redirect back after login
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if the route needs subscription validation
    if (session && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      try {
        // Get the user's business ID
        const userId = session.user.id;
        
        const { data: userData, error: userError } = await supabase
          .from('iqr_users')
          .select('business_id')
          .eq('auth_uid', userId)
          .single();
        
        if (userError || !userData) {
          console.error('Error getting business ID for user:', userError);
          // Redirect to subscription page if user data can't be found
          return NextResponse.redirect(new URL('/subscription/plans', request.url));
        }
        
        const businessId = userData.business_id;
        
        // Check subscription status
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('subscription_status')
          .eq('id', businessId)
          .single();
        
        if (businessError || !businessData) {
          console.error('Error getting business subscription data:', businessError);
          // Redirect to subscription page if business data can't be found
          return NextResponse.redirect(new URL('/subscription/plans', request.url));
        }
        
        // If no active subscription, redirect to subscription page
        if (businessData.subscription_status !== 'active') {
          log(`User ${userId} has no active subscription, redirecting to plans page`);
          return NextResponse.redirect(new URL('/subscription/plans', request.url));
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        // Default to redirecting to subscription page on error
        return NextResponse.redirect(new URL('/subscription/plans', request.url));
      }
    }

    // Continue with the request
    return NextResponse.next();
  } catch (err) {
    // Log any errors that occur in middleware
    console.error(`[Middleware Error][${new Date().toISOString()}]`, err);
    // Continue with the request even if there's an error in the middleware
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};