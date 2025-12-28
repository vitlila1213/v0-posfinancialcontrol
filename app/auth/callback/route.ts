import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const type = requestUrl.searchParams.get("type")

  console.log("[v0] Callback triggered:", {
    code: code ? "present" : "missing",
    type,
    next,
    origin: requestUrl.origin,
  })

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.log("[v0] Error exchanging code:", error.message)
      return NextResponse.redirect(new URL("/auth/client/login?error=invalid_code", requestUrl.origin))
    }

    if (data.user) {
      console.log("[v0] Session established for user:", data.user.id)

      if (next) {
        console.log("[v0] Next parameter detected, redirecting to:", next)
        return NextResponse.redirect(new URL(next, requestUrl.origin))
      }

      if (type === "recovery") {
        console.log("[v0] Recovery flow detected, redirecting to update-password")
        return NextResponse.redirect(new URL("/auth/client/update-password", requestUrl.origin))
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

      if (profile?.role === "admin") {
        console.log("[v0] Admin user detected, redirecting to admin panel")
        return NextResponse.redirect(new URL("/admin", requestUrl.origin))
      } else {
        console.log("[v0] Client user detected, redirecting to client area")
        return NextResponse.redirect(new URL("/cliente", requestUrl.origin))
      }
    }
  }

  console.log("[v0] No code provided, redirecting to login")
  return NextResponse.redirect(new URL("/auth/client/login", requestUrl.origin))
}
