"use client"

import { motion } from "framer-motion"
import { TrendingUp, Clock, DollarSign, Plus, Calculator, FileDown, Eye, EyeOff, RefreshCw } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { AnimatedNumber } from "@/components/animated-number"
import { AddTransactionModal } from "@/components/add-transaction-modal"
import { FeeSimulatorModal } from "@/components/fee-simulator-modal"
import { StatementModal } from "@/components/statement-modal"
import { BalanceChartCard } from "@/components/balance-chart-card"
import { VoiceAssistantButton } from "@/components/voice-assistant-button"
import { AnnouncementPopup } from "@/components/announcement-popup"
import { useState } from "react"
import type { VoiceCommand } from "@/app/actions/voice-assistant"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"

export default function ClienteDashboard() {
  const { user, profile, transactions, getClientBalances, isLoading, refreshData } = useSupabase()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSimulator, setShowSimulator] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const handleRefreshBalance = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
      toast.success("Saldo atualizado!")
    } catch (error) {
      toast.error("Erro ao atualizar saldo")
      console.error("[v0] Erro ao atualizar:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleVoiceCommand = (command: VoiceCommand) => {
    console.log("[v0] Voice command received:", command)

    switch (command.action) {
      case "navigate":
        if (command.target === "transactions") router.push("/cliente/transacoes")
        else if (command.target === "withdrawals") router.push("/cliente/saques")
        else if (command.target === "profile") router.push("/cliente/perfil")
        break
      case "add_transaction":
        setShowAddModal(true)
        break
      case "download_statement":
        setShowStatementModal(true)
        break
      case "simulate_fee":
        setShowSimulator(true)
        break
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const balances = getClientBalances(user.id)
  const userTransactions = transactions.filter((t) => t.user_id === user.id)

  const pendingBalance = userTransactions
    .filter((t) => t.status === "pending_verification")
    .reduce((sum, t) => sum + t.net_value, 0)

  return (
    <div className="space-y-6">
      <AnnouncementPopup />

      {/* Header with Balance Card moved to top right */}
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Olá, {profile?.full_name?.split(" ")[0] || "Cliente"}!
        </h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas vendas e saldos</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <VoiceAssistantButton onCommand={handleVoiceCommand} />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRefreshBalance}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
          title="Atualizar saldo"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowBalance(!showBalance)}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-500/20"
          title={showBalance ? "Ocultar saldos" : "Mostrar saldos"}
        >
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span className="hidden sm:inline">{showBalance ? "Ocultar" : "Mostrar"}</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowStatementModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
        >
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Extrato</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowSimulator(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
        >
          <Calculator className="h-4 w-4" />
          <span className="hidden sm:inline">Simular Taxa</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </motion.button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 sm:h-12 sm:w-12">
              <Clock className="h-5 w-5 text-amber-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Saldo Pendente</p>
              <p className="text-lg font-bold text-amber-500 sm:text-2xl">
                {showBalance ? <AnimatedNumber value={pendingBalance} /> : "••••••"}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 sm:h-12 sm:w-12">
              <TrendingUp className="h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Volume Total</p>
              <p className="text-lg font-bold text-blue-500 sm:text-2xl">
                {showBalance ? <AnimatedNumber value={balances.total} /> : "••••••"}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 sm:h-12 sm:w-12">
              <DollarSign className="h-5 w-5 text-rose-500 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Total Sacado</p>
              <p className="text-lg font-bold text-rose-500 sm:text-2xl">
                {showBalance ? <AnimatedNumber value={balances.withdrawn} /> : "••••••"}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <BalanceChartCard />

      <AddTransactionModal open={showAddModal} onOpenChange={setShowAddModal} />
      <FeeSimulatorModal open={showSimulator} onOpenChange={setShowSimulator} />
      <StatementModal open={showStatementModal} onOpenChange={setShowStatementModal} />
    </div>
  )
}
