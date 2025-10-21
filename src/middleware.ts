// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

// ✅ All routes here are PUBLIC (skip Clerk). We protect the rest below.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // ✅ internal automation / n8n entry points (these have their own secrets)
  "/api/internal/(.*)",          // <-- IMPORTANT: no backslashes here
  "/api/articles(.*)",           // n8n -> ingest callback (X-INGEST-SECRET)
  "/api/keywords-callback(.*)",  // optional callback

  // misc/static
  "/api/ping",
  "/_next(.*)",
  "/(.*)\\.(.*)$",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isPublicRoute(req)) return; // skip auth on public routes
  await auth.protect();           // everything else requires Clerk session
});

// Apply middleware to app + API routes (not static/_next)
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/api/(.*)"],
};