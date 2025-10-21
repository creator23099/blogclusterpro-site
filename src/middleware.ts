// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // --- n8n / system callbacks (guarded by their own secrets) ---
  "/api/internal/run-n8n(.*)",   // UI -> n8n trigger (writer)
  "/api/internal/n8n(.*)",       // outline trigger & any internal n8n helpers
  "/api/articles(.*)",           // n8n -> save article ingest (X-INGEST-SECRET)
  "/api/keywords-callback(.*)",  // if you use this callback

  // misc/static
  "/api/ping",
  "/_next(.*)",
  "/(.*)\\.(.*)$",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/api/(.*)"],
};