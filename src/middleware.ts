// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public endpoints (no auth)
const isPublicRoute = createRouteMatcher([
  "/",                     // optional: landing page
  "/dashboard",           // <-- make dashboard shell publicly reachable
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/n8n/(.*)",        // n8n posts here (keywords-callback etc.)
  "/api/ping",
  "/favicon.ico",
  "/_next(.*)",           // Next internals
  "/(.*)\\.(.*)$",        // Static assets
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;   // allow the public ones
  await auth.protect();             // everything else must be authed
});

// Match app routes + all /api/* (so /api/research stays protected)
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/api/(.*)"],
};