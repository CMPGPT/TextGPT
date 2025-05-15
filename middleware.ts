import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './types/supabase';

// Enhanced logging function
function log(...args: any[]) {
  console.log(`[Middleware][${new Date().toISOString()}]`, ...args);
}

export async function middleware(request: NextRequest) {
  try {
    // Get the pathname from the URL
    const { pathname } = request.nextUrl;
    
    log(`Processing request for: ${pathname}, Method: ${request.method}`);
    
    // Create a response object to modify
    const res = NextResponse.next();
    
    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient<Database>({ req: request, res });
    
    // Refresh the session - important for auth state
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      log(`Session error: ${sessionError.message}`);
    }
    
    // Debug session state
    log(`Session state for ${pathname}: ${session ? 'Authenticated' : 'Unauthenticated'}`);
    
    // Handle auth routes - when accessing /auth/* redirect to IQR equivalents
    // This ensures we use the right authentication flow
    if (pathname.startsWith('/auth/')) {
      log(`Redirecting from legacy auth route: ${pathname}`);
      const newPath = pathname.replace('/auth/', '/iqr/');
      return NextResponse.redirect(new URL(newPath, request.url));
    }
    
    // Handle IQR protected routes
    if (pathname.startsWith('/iqr/dashboard') || 
        pathname.startsWith('/iqr/qrcodes') || 
        pathname.startsWith('/iqr/upload')) {
      // If not authenticated, redirect to login
      if (!session) {
        log(`Redirecting unauthenticated user from ${pathname} to login`);
        return NextResponse.redirect(new URL('/iqr/login', request.url));
      }
    }
    
    // If user is signed in and tries to access login/signup pages, redirect to dashboard
    if (session && (pathname.startsWith('/iqr/login') || pathname.startsWith('/iqr/signup'))) {
      log(`Redirecting authenticated user from ${pathname} to dashboard`);
      return NextResponse.redirect(new URL('/iqr/dashboard', request.url));
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

    // Continue with the request and return the response with updated auth cookie
    return res;
  } catch (err) {
    // Log any errors that occur in middleware
    console.error(`[Middleware Error][${new Date().toISOString()}]`, err);
    // Continue with the request even if there's an error in the middleware
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/iqr/dashboard/:path*',
    '/iqr/qrcodes/:path*',
    '/iqr/upload/:path*',
    '/iqr/chat/:path*',
    '/iqr/login',
    '/iqr/signup',
    '/auth/:path*', // Add auth routes to redirect them to IQR routes
    '/api/:path*',
  ],
};