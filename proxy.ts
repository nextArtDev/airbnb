import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getSessionCookie } from "better-auth/cookies";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Locale-prefixed paths that require a session. The cookie check here is a UX
// convenience only - every server action and page re-checks the real session.
const PROTECTED_PATHS = ["/trips", "/favorites", "/hostings", "/inbox"];

function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin dashboard lives outside [locale]; cookie-presence gate only.
  // Role enforcement happens in app/(dashboard)/dashboard/layout.tsx.
  if (pathname.startsWith("/dashboard")) {
    if (!getSessionCookie(request)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (routing.locales.includes(maybeLocale as never)) {
    const restPath = `/${segments.slice(2).join("/")}`;
    if (!getSessionCookie(request) && isProtectedPath(restPath)) {
      const signIn = new URL(`/${maybeLocale}/sign-in`, request.url);
      signIn.searchParams.set("from", pathname);
      return NextResponse.redirect(signIn);
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
