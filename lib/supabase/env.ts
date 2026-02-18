export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dskkafxnppyyxzeizvln.supabase.co"
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  if (!url || !anonKey) {
    console.warn(
      `[v0] Missing Supabase environment variables. Using fallback URL. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel.`,
    )
    // Return fallback values instead of throwing
    return { 
      url: "https://dskkafxnppyyxzeizvln.supabase.co", 
      anonKey: anonKey || "" 
    }
  }

  return { url, anonKey }
}

export function getSupabaseServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dskkafxnppyyxzeizvln.supabase.co"
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!url || !serviceRoleKey) {
    console.warn(
      `[v0] Missing Supabase service role environment variables. Please check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.`,
    )
    // Return fallback values instead of throwing
    return { 
      url: "https://dskkafxnppyyxzeizvln.supabase.co", 
      serviceRoleKey: serviceRoleKey || "" 
    }
  }

  return { url, serviceRoleKey }
}
