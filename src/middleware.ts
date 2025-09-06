// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/", "/about", "/features", "/faq",
  "/pricing(.*)",
  "/sign-in(.*)", "/sign-up(.*)",
  "/api/ping",
  "/api/n8n/keywords-callback", // public webhook callback
  "/api/webhooks/stripe",
  "/api/publish",
  // ❌ Do NOT list /api/research or /api/keywords/suggest here,
  // because those routes require auth in your handlers.
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect(); // <-- correct usage
});

export const config = {
  matcher: [
    // everything except static files and _next
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/(api|trpc)(.*)",
  ],
};