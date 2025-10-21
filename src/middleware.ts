// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Keep this list conservative: only obvious public pages, static assets,
 * and ALL of /api/internal/* (these endpoints have their own secrets).
 */
const isPublicRoute = createRouteMatcher([
  "/",                     // homepage
  "/about(.*)",
  "/pricing(.*)",
  "/faq(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // --- internal automation / n8n entry points (must stay public) ---
  "/api/internal/(.*)",    // <- IMPORTANT: whitelist ALL internal routes

  // --- misc/static ---
  "/api/ping",
  "/_next(.*)",
  "/favicon.ico",
  "/(.*)\\.(.*)$",         // files: .js, .css, .png, etc.
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public
  if (isPublicRoute(req)) return;
  // Everything else requires a Clerk session
  await auth.protect();
});

/**
 * Apply middleware to app routes and API routes, but not to static files/_next
 */
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};