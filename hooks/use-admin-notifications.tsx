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

    // Function to check for new pending transactions/receipts
    const checkNewPendingItems = async () => {
      try {
        // Check for new pending transactions
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("id, amount, type, created_at, profiles!transactions_client_id_fkey(name)")
          .eq("status", "pending")
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (txError) {
          console.error("[v0] Error checking pending transactions:", txError)
        }

        // Check for new pending receipts
        const { data: receipts, error: rcError } = await supabase
          .from("receipts")
          .select(
            "id, transaction_id, created_at, transactions(amount, type, profiles!transactions_client_id_fkey(name))",
          )
          .eq("status", "pending")
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (rcError) {
          console.error("[v0] Error checking pending receipts:", rcError)
        }

        const now = new Date()
        let hasNewItems = false

        // Notify about new transactions
        if (transactions && transactions.length > 0) {
          const newTx = transactions.filter((t) => new Date(t.created_at) > lastCheckRef.current)

          if (newTx.length > 0) {
            hasNewItems = true
            console.log("[v0] New pending transactions detected:", newTx.length)

            const clientName = newTx[0].profiles?.name || "Cliente"
            const txType = newTx[0].type === "deposit" ? "Depósito" : "Saque"
            const amount = newTx[0].amount.toFixed(2)

            await playNotification("Nova Transação Pendente", `${clientName}: ${txType} de R$ ${amount}`)
          }
        }

        // Notify about new receipts
        if (receipts && receipts.length > 0) {
          const newRc = receipts.filter((r) => new Date(r.created_at) > lastCheckRef.current)

          if (newRc.length > 0) {
            hasNewItems = true
            console.log("[v0] New pending receipts detected:", newRc.length)

            const clientName = newRc[0].transactions?.profiles?.name || "Cliente"
            const amount = newRc[0].transactions?.amount?.toFixed(2) || "0.00"

            await playNotification("Novo Comprovante Pendente", `${clientName}: Comprovante de R$ ${amount}`)
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
