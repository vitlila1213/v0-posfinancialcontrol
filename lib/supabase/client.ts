import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "./env"

export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  
  // If anonKey is empty, throw a more descriptive error
  if (!anonKey || anonKey === "") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please configure it in your Vercel environment variables."
    )
  }
  
  return createBrowserClient(url, anonKey)
}
