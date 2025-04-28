import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Authentication middleware
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/iqr/:path*',
    '/kiwi/:path*',
    '/subscription/:path*',
  ],
};