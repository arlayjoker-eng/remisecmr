import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Role gating:
//  - not logged in        → /login
//  - role "laptop"        → /scan, /student/*
//  - role "casier"        → /scan, /casier/*
//  - cross-role access    → bounced back to /scan
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;
  const onLogin = pathname === "/login";

  if (!session?.user) {
    return onLogin
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (onLogin) {
    return NextResponse.redirect(new URL("/scan", req.nextUrl));
  }
  if (pathname.startsWith("/student") && role !== "laptop") {
    return NextResponse.redirect(new URL("/scan", req.nextUrl));
  }
  if (pathname.startsWith("/casier") && role !== "casier") {
    return NextResponse.redirect(new URL("/scan", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|cmr-logo.png).*)"],
};
