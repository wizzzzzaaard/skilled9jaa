import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CAMPAIGN_SLUGS } from "@/lib/campaigns";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const path = request.nextUrl.pathname;

  // Public paths — always allow.
  // Match the exact path or a sub-path ("/find" and "/find/x", never "/findings").
  // "/" must only match the home page: a bare startsWith("/") made every route public.
  const publicPrefixes = ["/about", "/homeservice", "/find", "/login",
    "/signup", "/suspended", "/bill", "/book", "/company", "/provider",
    "/jobs", "/privacy", "/terms", "/forgot-password", "/reset-password",
    ...CAMPAIGN_SLUGS.map((slug) => `/${slug}`),
  ];
  const isPublic = path === "/" || publicPrefixes.some(p => path === p || path.startsWith(`${p}/`));

  if (!session) {
    if (!isPublic) {
      // Send them back here after they log in.
      const login = new URL("/login", request.url);
      login.searchParams.set("next", path + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
    return response;
  }

  // Fetch profile for all authenticated users
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status, signup_step, is_admin")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const status = profile.account_status;

  // Admin gate
  if (path.startsWith("/admin") && !profile.is_admin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Onboarding gate — applies everywhere except onboarding paths
  // Resetting a password must work whatever state the account is in.
  const isOnboardingPath = path.startsWith("/signup") || path === "/suspended" || path === "/reset-password";

  if (!isOnboardingPath) {
    if (status === "incomplete") {
      const step = profile.signup_step || 1;
      return NextResponse.redirect(
        new URL(`/signup?resume=true&step=${step}`, request.url)
      );
    }
    if (status === "pending_payment") {
      return NextResponse.redirect(new URL("/signup?resume=true&step=payment", request.url));
    }
    if (status === "pending_manual") {
      return NextResponse.redirect(new URL("/signup/pending", request.url));
    }
    if (status === "pending_verify") {
      return NextResponse.redirect(new URL("/signup/pending", request.url));
    }
    if (status === "suspended") {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};