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
    if (!userId || !isAdmin || !supabase) {
      console.log("[v0] Admin notifications not starting:", { userId, isAdmin, hasSupabase: !!supabase })
      return
    }

    console.log("[v0] ✅ Starting admin notifications monitoring for user:", userId)

    const checkNewPendingItems = async () => {
      try {
        console.log("[v0] 🔍 Checking for new items at:", new Date().toISOString())
        const now = new Date()
        let hasNewItems = false

        console.log("[v0] Querying transactions since:", lastCheckRef.current.toISOString())
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("id, gross_value, payment_type, created_at, user_id")
          .eq("status", "pending_verification")
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (txError) {
          console.error("[v0] ❌ Error checking pending transactions:", txError.message)
        } else {
          console.log("[v0] 📊 Found transactions:", transactions?.length || 0, transactions)
          if (transactions && transactions.length > 0) {
            const newTx = transactions.filter((t) => new Date(t.created_at) > lastCheckRef.current)
            console.log("[v0] 🆕 New transactions (filtered):", newTx.length)

            if (newTx.length > 0) {
              console.log("[v0] 🔔 NOTIFICATION: NEW TRANSACTION")
              hasNewItems = true

              const { data: userProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", newTx[0].user_id)
                .single()

              const clientName = userProfile?.full_name || "Cliente"
              const txType = newTx[0].payment_type === "debit" ? "Débito" : "Crédito"
              const amount = newTx[0].gross_value || 0

              await playNotification(
                "Nova Transação Pendente",
                `${clientName}: ${txType} de R$ ${Number(amount).toFixed(2)}`,
              )
            }
          }
        }

        console.log("[v0] Querying withdrawals since:", lastCheckRef.current.toISOString())
        const { data: withdrawals, error: wdError } = await supabase
          .from("withdrawals")
          .select("id, amount, withdrawal_method, created_at, user_id")
          .eq("status", "pending")
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (wdError) {
          console.error("[v0] ❌ Error checking pending withdrawals:", wdError.message)
        } else {
          console.log("[v0] 💰 Found withdrawals:", withdrawals?.length || 0, withdrawals)
          if (withdrawals && withdrawals.length > 0) {
            const newWd = withdrawals.filter((w) => new Date(w.created_at) > lastCheckRef.current)
            console.log("[v0] 🆕 New withdrawals (filtered):", newWd.length)

            if (newWd.length > 0) {
              console.log("[v0] 🔔 NOTIFICATION: NEW WITHDRAWAL")
              hasNewItems = true

              const { data: userProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", newWd[0].user_id)
                .single()

              const clientName = userProfile?.full_name || "Cliente"
              const method = newWd[0].withdrawal_method === "pix" ? "PIX" : "Transferência"
              const amount = newWd[0].amount || 0

              await playNotification(
                "Nova Solicitação de Saque",
                `${clientName}: ${method} - R$ ${Number(amount).toFixed(2)}`,
              )
            }
          }
        }

        console.log("[v0] Querying new users since:", lastCheckRef.current.toISOString())
        const { data: newUsers, error: userError } = await supabase
          .from("profiles")
          .select("id, full_name, email, created_at")
          .eq("role", "client")
          .gte("created_at", lastCheckRef.current.toISOString())
          .order("created_at", { ascending: false })

        if (userError) {
          console.error("[v0] ❌ Error checking new users:", userError.message)
        } else {
          console.log("[v0] 👥 Found new users:", newUsers?.length || 0, newUsers)
          if (newUsers && newUsers.length > 0) {
            const reallyNewUsers = newUsers.filter((u) => new Date(u.created_at) > lastCheckRef.current)
            console.log("[v0] 🆕 New users (filtered):", reallyNewUsers.length)

            if (reallyNewUsers.length > 0) {
              console.log("[v0] 🔔 NOTIFICATION: NEW USER")
              hasNewItems = true
              const userName = reallyNewUsers[0].full_name || reallyNewUsers[0].email
              await playNotification("Novo Cadastro", `${userName} se cadastrou no sistema`)
            }
          }
        }

        if (hasNewItems) {
          console.log("[v0] ✅ Updating lastCheckRef to:", now.toISOString())
          lastCheckRef.current = now
        } else {
          console.log("[v0] ℹ️ No new items found")
        }
      } catch (error) {
        console.error("[v0] ❌ Error in checkNewPendingItems:", error)
      }
    }

    checkNewPendingItems()
    checkIntervalRef.current = setInterval(checkNewPendingItems, 10000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [userId, isAdmin, supabase, playNotification])
}
