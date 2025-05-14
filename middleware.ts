import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Enhanced logging function
function log(...args: any[]) {
  console.log(`[Middleware][${new Date().toISOString()}]`, ...args);
}

export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  
  log(`Processing request for: ${pathname}, Method: ${request.method}`);
  
  // Get IQR session from cookies
  const isIqrAuthenticated = request.cookies.has('iqr_authenticated');
  
  // Handle IQR authentication
  if (pathname.startsWith('/iqr/dashboard') || 
      pathname.startsWith('/iqr/qrcodes') || 
      pathname.startsWith('/iqr/upload')) {
    // If not authenticated, redirect to login
    if (!isIqrAuthenticated) {
      log(`Redirecting unauthenticated user from ${pathname} to login`);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    // Log the API request but don't process further
    // Let the route handlers handle their own requests
    log(`Middleware detected API request: ${pathname}, Method: ${request.method}`);
    
    // For API routes, just add CORS headers and pass through
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }

  // Continue with the request otherwise
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/iqr/dashboard/:path*',
    '/iqr/qrcodes/:path*',
    '/iqr/upload/:path*',
    '/api/:path*',
  ],
};