"use client"

import type React from "react"
import { useSupabase } from "@/lib/supabase-context"
import { useAdminNotifications } from "@/hooks/use-admin-notifications"

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useSupabase()

  useAdminNotifications(user?.id, profile?.role === "admin")

  return <>{children}</>
}
