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

    console.log("[v0] Starting client notifications monitoring")

    // Function to check for new transactions
    const checkNewTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("id, amount, type, status, created_at")
          .eq("client_id", userId)
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[v0] Error checking transactions:", error)
          return
        }

        if (data && data.length > 0) {
          // Filter transactions created after last check (excluding the initial load)
          const now = new Date()
          const newTransactions = data.filter((t) => new Date(t.created_at) > lastCheckRef.current)

          if (newTransactions.length > 0) {
            console.log("[v0] New transactions detected:", newTransactions.length)

            for (const transaction of newTransactions) {
              let message = ""
              if (transaction.type === "deposit") {
                message = `Depósito de R$ ${transaction.amount.toFixed(2)}`
              } else if (transaction.type === "withdrawal") {
                message = `Saque de R$ ${transaction.amount.toFixed(2)}`
              }

              if (transaction.status === "pending") {
                message += " - Aguardando aprovação"
              } else if (transaction.status === "approved") {
                message += " - Aprovado!"
              } else if (transaction.status === "rejected") {
                message += " - Rejeitado"
              }

              await playNotification("Nova Transação", message)
            }
          }

          lastCheckRef.current = now
        }
      } catch (error) {
        console.error("[v0] Error in checkNewTransactions:", error)
      }
    }

    // Check immediately
    checkNewTransactions()

    // Set up polling every 10 seconds
    checkIntervalRef.current = setInterval(checkNewTransactions, 10000)

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [userId, supabase, playNotification])
}
