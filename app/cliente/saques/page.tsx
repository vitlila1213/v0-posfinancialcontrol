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

      {/* Removed botão de estorno da aba de saques */}
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
        <h3 className="mb-4 text-base font-semibold text-foreground sm:text-lg">Histórico de Saques</h3>
        <WithdrawalsTableClient />
      </GlassCard>

      <RequestWithdrawalModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        availableBalance={balances.available}
      />
    </div>
  )
}
