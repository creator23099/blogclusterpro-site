// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public (no auth) routes
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // --- n8n / system callbacks (guarded by their own secrets) ---
  "/api/internal/run-n8n(.*)",  // UI -> n8n trigger
  "/api/articles(.*)",          // n8n -> save article ingest (X-INGEST-SECRET)
  "/api/keywords-callback(.*)", // if you use this callback

  // Misc/static
  "/api/ping",
  "/_next(.*)",
  "/(.*)\\.(.*)$",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;   // allow public endpoints
  await auth.protect();             // everything else requires Clerk session
});

// Keep this matcher; it applies middleware to all app & API routes except static files/_next
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/api/(.*)"],
};