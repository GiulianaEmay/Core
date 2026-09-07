import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Todo requiere sesion salvo la home y las pantallas de Clerk. Cualquier
// modulo nuevo que se agregue queda protegido por defecto sin tener que
// acordarse de listarlo aqui.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};
