import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv, getSupabaseServiceEnv } from "./env"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Try to get Supabase env, but don't crash if not available yet
  let url: string
  let anonKey: string
  
  try {
    const env = getSupabaseEnv()
    url = env.url
    anonKey = env.anonKey
  } catch (error) {
    console.error("[v0] Supabase env not available in middleware, skipping auth check:", error)
    // Return early if Supabase is not configured yet
    return supabaseResponse
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas protegidas
  const isClientRoute = request.nextUrl.pathname.startsWith("/cliente")
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth")

  if ((isClientRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone()
    // Redireciona para a página de login apropriada baseado na rota tentada
    url.pathname = isAdminRoute ? "/auth/admin/login" : "/auth/client/login"
    return NextResponse.redirect(url)
  }

  let adminClient
  try {
    const { url: serviceUrl, serviceRoleKey } = getSupabaseServiceEnv()
    adminClient = createServerClient(serviceUrl, serviceRoleKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        },
      },
    })
  } catch (error) {
    console.error("[v0] Supabase service role not available, skipping role check:", error)
    return supabaseResponse
  }

  // Se está logado, verifica o role para redirecionar corretamente
  if (user && (isClientRoute || isAdminRoute)) {
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single()

    const userRole = profile?.role || "client"

    // Admin tentando acessar área de cliente
    if (isClientRoute && userRole === "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.redirect(url)
    }

    // Cliente tentando acessar área de admin
    if (isAdminRoute && userRole !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/cliente"
      return NextResponse.redirect(url)
    }
  }

  if (user && isAuthRoute && request.nextUrl.pathname === "/auth/login") {
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role || "client"
    const url = request.nextUrl.clone()
    url.pathname = userRole === "admin" ? "/admin" : "/cliente"
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === "/auth/client/login" || request.nextUrl.pathname === "/auth/admin/login")) {
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role || "client"
    const url = request.nextUrl.clone()
    url.pathname = userRole === "admin" ? "/admin" : "/cliente"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
