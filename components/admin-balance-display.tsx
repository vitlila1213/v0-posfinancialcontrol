"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { formatCurrency } from "@/lib/pos-rates"

export function AdminBalanceDisplay() {
  const { clients } = useSupabase()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const totalAvailableBalance = clients.reduce((sum, client) => {
    return sum + (client.balance || 0)
  }, 0)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Disponível Total</span>
        <span className="text-2xl font-bold text-emerald-500">{formatCurrency(totalAvailableBalance)}</span>
      </div>
      <button
        onClick={handleRefresh}
        className={`rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground ${
          isRefreshing ? "animate-spin" : ""
        }`}
        aria-label="Atualizar saldo"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  )
}
