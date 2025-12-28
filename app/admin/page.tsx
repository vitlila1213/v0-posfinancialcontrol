"use client"

import { TrendingUp, Users, FileCheck, Banknote, RefreshCw } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { AnimatedNumber } from "@/components/animated-number"
import { AdminChartCard } from "@/components/admin-chart-card"
import { motion } from "framer-motion"
import { useState } from "react"
import { toast } from "react-toastify"

export default function AdminOverview() {
  const { transactions, withdrawals, clients, isLoading, refreshData } = useSupabase()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
      toast.success("Dados atualizados!")
    } catch (error) {
      toast.error("Erro ao atualizar dados")
      console.error("[v0] Erro ao atualizar:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const totalVolume = transactions.filter((t) => t.status !== "rejected").reduce((sum, t) => sum + t.gross_value, 0)

  const totalNetVolume = transactions.filter((t) => t.status !== "rejected").reduce((sum, t) => sum + t.net_value, 0)

  const pendingReceipts = transactions.filter((t) => t.status === "pending_verification").length
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Acompanhe os indicadores do sistema</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
          title="Atualizar dados"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 sm:h-12 sm:w-12">
              <TrendingUp className="h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Volume Total</p>
              <p className="text-lg font-bold text-blue-500 sm:text-2xl">
                <AnimatedNumber value={totalVolume} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 sm:h-12 sm:w-12">
              <Banknote className="h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Volume Total Líquido</p>
              <p className="text-lg font-bold text-emerald-500 sm:text-2xl">
                <AnimatedNumber value={totalNetVolume} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 sm:h-12 sm:w-12">
              <FileCheck className="h-5 w-5 text-amber-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Comprovantes Pendentes</p>
              <p className="text-lg font-bold text-amber-500 sm:text-2xl">{pendingReceipts}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 sm:h-12 sm:w-12">
              <Users className="h-5 w-5 text-purple-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Saques Pendentes</p>
              <p className="text-lg font-bold text-purple-500 sm:text-2xl">{pendingWithdrawals}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <AdminChartCard transactions={transactions} />
    </div>
  )
}
