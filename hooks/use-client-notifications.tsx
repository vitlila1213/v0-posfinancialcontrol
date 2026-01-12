"use client"

import { useEffect, useRef } from "react"
import { useSupabase } from "@/lib/supabase-context"
import { useNotificationSound } from "./use-notification-sound"

export function useClientNotifications(userId: string | undefined) {
  const { supabase } = useSupabase()
  const { playNotification } = useNotificationSound()
  const lastCheckRef = useRef<Date>(new Date())
  const checkIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!userId || !supabase) return

    console.log("[v0] Starting client notifications monitoring for user:", userId)

    const checkNewNotifications = async () => {
      try {
        console.log("[v0] 🔍 Checking for new client notifications at:", new Date().toISOString())

        const { data: notifications, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .eq("read", false)
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[v0] ❌ Error checking notifications:", error.message)
          return
        }

        console.log("[v0] 📬 Found notifications:", notifications?.length || 0, notifications)

        if (notifications && notifications.length > 0) {
          const newNotifs = notifications.filter((n) => new Date(n.created_at) > lastCheckRef.current)
          console.log("[v0] 🆕 New notifications (filtered):", newNotifs.length)

          if (newNotifs.length > 0) {
            console.log("[v0] 🔔 PLAYING NOTIFICATIONS")

            for (const notif of newNotifs) {
              await playNotification(notif.title, notif.message)
            }

            lastCheckRef.current = new Date()
          }
        } else {
          console.log("[v0] ℹ️ No new notifications found")
        }
      } catch (error) {
        console.error("[v0] ❌ Error in checkNewNotifications:", error)
      }
    }

    checkNewNotifications()
    checkIntervalRef.current = setInterval(checkNewNotifications, 5000) // Check every 5 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [userId, supabase, playNotification])
}
