"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Wallet, Plus } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { AnimatedNumber } from "@/components/animated-number"
import { WithdrawalsTableClient } from "@/components/withdrawals-table-client"
import { RequestWithdrawalModal } from "@/components/request-withdrawal-modal"

export default function SaquesPage() {
  const { user, getClientBalances, isLoading } = useSupabase()
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  if (isLoading || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const balances = getClientBalances(user.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Saques</h1>
          <p className="text-sm text-muted-foreground">Solicite e acompanhe seus saques</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowRequestModal(true)}
          disabled={balances.available <= 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Solicitar Saque
        </motion.button>
      </div>

      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
            <Wallet className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Disponível para Saque</p>
            <p className="text-2xl font-bold text-emerald-500">
              <AnimatedNumber value={balances.available} />
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground sm:text-lg">Histórico de Saques</h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Método:</span>
              <button
                onClick={() => setMethodFilter("all")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  methodFilter === "all"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setMethodFilter("pix")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  methodFilter === "pix"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                PIX
              </button>
              <button
                onClick={() => setMethodFilter("transfer")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  methodFilter === "transfer"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Transferência
              </button>
              <button
                onClick={() => setMethodFilter("boleto")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  methodFilter === "boleto"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Boleto
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "pending"
                    ? "bg-amber-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Pendente
              </button>
              <button
                onClick={() => setStatusFilter("paid")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === "paid"
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Pago
              </button>
            </div>
          </div>
        </div>

        <WithdrawalsTableClient methodFilter={methodFilter} statusFilter={statusFilter} />
      </GlassCard>

      <RequestWithdrawalModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        availableBalance={balances.available}
      />
    </div>
  )
}
