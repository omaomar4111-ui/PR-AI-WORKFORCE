import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    const token = request.cookies.get("pr_auth_token")?.value;
    const target = token ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
