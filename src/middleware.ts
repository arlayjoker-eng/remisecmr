import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Landing page per role.
function homeFor(role?: string): string {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "STAFF_MANAGER") return "/reports";
  return "/scan";
}

function forbidden(): NextResponse {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>403 — Accès interdit</title>
<style>
  html,body{margin:0;height:100%;font-family:system-ui,-apple-system,sans-serif}
  body{display:flex;align-items:center;justify-content:center;
    background:linear-gradient(180deg,#6B3FE0 0%,#4B1FB0 55%,#2D0F75 100%);color:#fff}
  .c{text-align:center;padding:40px}
  .b{font-size:64px;font-weight:800;letter-spacing:-2px}
  .t{font-size:22px;font-weight:800;margin-top:8px}
  .s{opacity:.7;margin-top:8px;font-size:14px}
  a{display:inline-block;margin-top:24px;background:#fff;color:#2D0F75;
    text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px}
</style></head><body><div class="c">
<div class="b">403</div>
<div class="t">Accès interdit</div>
<div class="s">Votre compte n'a pas les droits pour cette page.</div>
<a href="/">Retour à l'accueil</a>
</div></body></html>`;
  return new NextResponse(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Role gating:
//  - /admin/*   → SUPER_ADMIN
//  - /reports   → SUPER_ADMIN, STAFF_MANAGER
//  - /scan, /student/*, /casier/* → tout utilisateur authentifié
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
    return NextResponse.redirect(new URL(homeFor(role), req.nextUrl));
  }

  if (pathname.startsWith("/admin") && role !== "SUPER_ADMIN") {
    return forbidden();
  }
  if (
    pathname.startsWith("/reports") &&
    role !== "SUPER_ADMIN" &&
    role !== "STAFF_MANAGER"
  ) {
    return forbidden();
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|cmr-logo.png|icons|manifest.json).*)",
  ],
};
