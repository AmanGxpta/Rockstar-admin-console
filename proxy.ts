import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * The Clerk webhook is public because it arrives from Clerk's servers with no
 * session — it authenticates itself by svix signature instead. Protecting it
 * would reject every delivery, and with it every users row the RLS policies
 * resolve against.
 */
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/no-access",
  "/api/webhooks/(.*)",
]);

/**
 * Optimistic gate only — it checks for a Clerk session, not for a role.
 * The authoritative role check lives in app/(app)/layout.tsx.
 *
 * auth.protect() redirects signed-out users to NEXT_PUBLIC_CLERK_SIGN_IN_URL,
 * so that env var must be set to /login or this misbehaves silently.
 */
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
