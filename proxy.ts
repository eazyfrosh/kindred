import { NextResponse, type NextRequest } from 'next/server';

// An early navigation redirect only. Every protected page and API independently
// verifies the signed session and current role with Firebase Admin.
export function proxy(request: NextRequest) {
  if (!request.cookies.has('__session')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/start-a-fundraiser/:path*'],
};
