import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    if (!code || !userId) {
      return NextResponse.json({ error: "Missing code or userId" }, { status: 400 })
    }

    console.log("[v0] 📝 API: Marking code as used:", code, "for user:", userId)

    // Create a Supabase client with service role to bypass RLS
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("access_codes")
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("code", code)
      .eq("is_used", false) // Only update if not already used
      .select()

    if (error) {
      console.error("[v0] ❌ API: Error marking code as used:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error("[v0] ❌ API: Code not found or already used")
      return NextResponse.json({ error: "Code not found or already used" }, { status: 404 })
    }

    console.log("[v0] ✅ API: Code marked as used successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] ❌ API: Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
