// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  
  // Internal automation routes - MUST be public
  "/api/internal(.*)",           // Simplified: no trailing slash needed
  "/api/articles(.*)",
  "/api/keywords-callback(.*)",
  "/api/ping",
  
  // Static assets
  "/_next(.*)",
  "/favicon.ico",
]);

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  
  // DEBUG: Log every /api/internal hit (remove after fixing)
  if (path.startsWith('/api/internal')) {
    console.log('[Middleware] /api/internal hit:', {
      path,
      isPublic: isPublicRoute(req),
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Early return for public routes - don't await auth at all
  if (isPublicRoute(req)) {
    return NextResponse.next();  // Explicit NextResponse
  }
  
  // Protect everything else
  await auth.protect();
});

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Explicitly include all API routes
    "/api/(.*)",
  ],
};