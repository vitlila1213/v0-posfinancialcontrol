"use client"

import type React from "react"

import { useSupabase } from "@/lib/supabase-context"
import { AnimatedNumber } from "@/components/animated-number"
import { Eye, EyeOff, RefreshCw } from "lucide-react"
import { useState } from "react"

export function CompactBalanceCard() {
  const { user, getClientBalances, refreshData } = useSupabase()
  const [showBalance, setShowBalance] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!user) return null

  const balances = getClientBalances(user.id)

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRefreshing(true)
    await refreshData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <div className="flex items-center gap-2">
      <div onClick={() => setShowBalance(!showBalance)} className="flex items-center gap-2 cursor-pointer group">
        <div className="flex flex-col items-end">
          <p className="text-sm font-medium text-emerald-400">Disponível</p>
          <p className="text-lg font-bold text-emerald-400">
            {showBalance ? <AnimatedNumber value={balances.available} /> : "••••••"}
          </p>
        </div>
        <button className="text-emerald-400/60 hover:text-emerald-400 transition-colors">
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="text-emerald-400/60 hover:text-emerald-400 transition-colors disabled:opacity-50"
        title="Atualizar saldo"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  )
}
