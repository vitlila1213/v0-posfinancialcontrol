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

    const checkNewItems = async () => {
      try {
        const now = new Date()
        let hasNewItems = false

        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("id, gross_value, status, updated_at, rejection_reason")
          .eq("user_id", userId)
          .in("status", ["verified", "rejected"])
          .gte("updated_at", lastCheckRef.current.toISOString())
          .order("updated_at", { ascending: false })

        if (txError) {
          console.error("[v0] Error checking transactions:", txError.message)
        } else if (transactions && transactions.length > 0) {
          const newTx = transactions.filter((t) => new Date(t.updated_at) > lastCheckRef.current)

          if (newTx.length > 0) {
            hasNewItems = true

            for (const transaction of newTx) {
              const amount = Number(transaction.gross_value).toFixed(2)

              if (transaction.status === "verified") {
                await playNotification("Transação Aprovada", `R$ ${amount} foi aprovado e creditado na sua conta!`)
              } else if (transaction.status === "rejected") {
                const reason = transaction.rejection_reason || "Motivo não informado"
                await playNotification("Transação Recusada", `R$ ${amount} foi recusada. Motivo: ${reason}`)
              }
            }
          }
        }

        const { data: withdrawals, error: wdError } = await supabase
          .from("withdrawals")
          .select("id, amount, status, updated_at, rejection_reason")
          .eq("user_id", userId)
          .in("status", ["paid", "rejected"])
          .gte("updated_at", lastCheckRef.current.toISOString())
          .order("updated_at", { ascending: false })

        if (wdError) {
          console.error("[v0] Error checking withdrawals:", wdError.message)
        } else if (withdrawals && withdrawals.length > 0) {
          const newWd = withdrawals.filter((w) => new Date(w.updated_at) > lastCheckRef.current)

          if (newWd.length > 0) {
            hasNewItems = true

            for (const withdrawal of newWd) {
              const amount = Number(withdrawal.amount).toFixed(2)

              if (withdrawal.status === "paid") {
                await playNotification("Saque Aprovado", `Seu saque de R$ ${amount} foi processado com sucesso!`)
              } else if (withdrawal.status === "rejected") {
                const reason = withdrawal.rejection_reason || "Motivo não informado"
                await playNotification("Saque Recusado", `Seu saque de R$ ${amount} foi recusado. Motivo: ${reason}`)
              }
            }
          }
        }

        const { data: chargebacks, error: cbError } = await supabase
          .from("transactions")
          .select("id, gross_value, chargeback_reason, chargeback_at")
          .eq("user_id", userId)
          .eq("is_chargeback", true)
          .gte("chargeback_at", lastCheckRef.current.toISOString())
          .order("chargeback_at", { ascending: false })

        if (cbError) {
          console.error("[v0] Error checking chargebacks:", cbError.message)
        } else if (chargebacks && chargebacks.length > 0) {
          const newCb = chargebacks.filter((c) => new Date(c.chargeback_at) > lastCheckRef.current)

          if (newCb.length > 0) {
            hasNewItems = true

            for (const chargeback of newCb) {
              const amount = Number(chargeback.gross_value).toFixed(2)
              const reason = chargeback.chargeback_reason || "Motivo não informado"
              await playNotification("Estorno Realizado", `R$ ${amount} foi estornado. Motivo: ${reason}`)
            }
          }
        }

        if (hasNewItems) {
          lastCheckRef.current = now
        }
      } catch (error) {
        console.error("[v0] Error in checkNewItems:", error)
      }
    }

    checkNewItems()
    checkIntervalRef.current = setInterval(checkNewItems, 10000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [userId, supabase, playNotification])
}
