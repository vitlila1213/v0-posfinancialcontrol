"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Search, FileDown } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Input } from "@/components/ui/input"
import { AddTransactionModal } from "@/components/add-transaction-modal"
import { TransactionsTableClient } from "@/components/transactions-table-client"
import { ChargebackModal } from "@/components/chargeback-modal"
import { StatementModal } from "@/components/statement-modal"
import type { Transaction } from "@/lib/types"

export default function TransacoesPage() {
  const { user, transactions, isLoading } = useSupabase()
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState("")
  const [chargebackTransaction, setChargebackTransaction] = useState<Transaction | null>(null)
  const [showStatementModal, setShowStatementModal] = useState(false)

  if (isLoading || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const userTransactions = transactions.filter((t) => t.user_id === user.id)

  const filteredTransactions = userTransactions.filter((t) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      t.brand.toLowerCase().includes(searchLower) ||
      t.status.toLowerCase().includes(searchLower) ||
      t.gross_value.toString().includes(search)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Transações</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas vendas</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowStatementModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <FileDown className="h-4 w-4" />
            Extrato
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
      </div>

      <GlassCard className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">Histórico de Transações</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-white/10 bg-white/5"
            />
          </div>
        </div>

        <TransactionsTableClient transactions={filteredTransactions} onChargeback={setChargebackTransaction} />
      </GlassCard>

      <AddTransactionModal open={showAddModal} onOpenChange={setShowAddModal} />

      <ChargebackModal transaction={chargebackTransaction} onClose={() => setChargebackTransaction(null)} />

      <StatementModal open={showStatementModal} onOpenChange={setShowStatementModal} />
    </div>
  )
}
