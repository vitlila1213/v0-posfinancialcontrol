"use client"

import { useEffect, useRef } from "react"
import { useSupabase } from "@/lib/supabase-context"
import { useNotificationSound } from "./use-notification-sound"

export function useAdminNotifications(userId: string | undefined, isAdmin: boolean) {
  const { supabase } = useSupabase()
  const { playNotification } = useNotificationSound()
  const lastCheckRef = useRef<Date>(new Date())
  const checkIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!userId || !isAdmin || !supabase) return

    console.log("[v0] Starting admin notifications monitoring")

    const checkNewPendingItems = async () => {
      try {
        // Check for new pending transactions
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("id, gross_value, payment_type, created_at, user_id")
          .eq("status", "pending")
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (txError) {
          console.error("[v0] Error checking pending transactions:", txError.message)
          return
        }

        const now = new Date()
        let hasNewItems = false

        // Notify about new transactions
        if (transactions && transactions.length > 0) {
          const newTx = transactions.filter((t) => new Date(t.created_at) > lastCheckRef.current)

          if (newTx.length > 0) {
            hasNewItems = true
            console.log("[v0] New pending transactions detected:", newTx.length)

            // Get user name separately
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", newTx[0].user_id)
              .single()

            const clientName = userProfile?.full_name || "Cliente"
            const txType = newTx[0].payment_type === "debit" ? "Débito" : "Transação"
            const amount = newTx[0].gross_value || 0

            await playNotification(
              "Nova Transação Pendente",
              `${clientName}: ${txType} de R$ ${Number(amount).toFixed(2)}`,
            )
          }
        }

        if (hasNewItems) {
          lastCheckRef.current = now
        }
      } catch (error) {
        console.error("[v0] Error in checkNewPendingItems:", error)
      }
    }

    // Check immediately
    checkNewPendingItems()

    // Set up polling every 15 seconds
    checkIntervalRef.current = setInterval(checkNewPendingItems, 15000)

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [userId, isAdmin, supabase, playNotification])
}
