"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase-context"
import { useAdminNotifications } from "@/hooks/use-admin-notifications"

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, supabase } = useSupabase()
  const [isAdminVerified, setIsAdminVerified] = useState(false)

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user?.id || !supabase) {
        console.log("[v0] Cannot verify admin: no user or supabase", { userId: user?.id, hasSupabase: !!supabase })
        return
      }

      console.log("[v0] Verifying admin status for user:", user.id)

      const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (error) {
        console.error("[v0] Error verifying admin:", error.message)
        setIsAdminVerified(false)
      } else {
        const isAdmin = data?.role === "admin"
        console.log("[v0] Admin verification result:", { role: data?.role, isAdmin })
        setIsAdminVerified(isAdmin)
      }
    }

    verifyAdmin()
  }, [user?.id, supabase])

  useAdminNotifications(user?.id, isAdminVerified)

  return <>{children}</>
}
