"use client"

import type React from "react"
import { useSupabase } from "@/lib/supabase-context"
import { useClientNotifications } from "@/hooks/use-client-notifications"

export function ClientNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSupabase()

  useClientNotifications(user?.id)

  return <>{children}</>
}
