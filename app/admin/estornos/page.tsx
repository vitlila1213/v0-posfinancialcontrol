"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Check, X, AlertTriangle, Eye } from "lucide-react"
import { formatCurrency } from "@/lib/pos-rates"
import { formatBrandName, formatPaymentType } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

export default function EstornosPage() {
  const { chargebacks, transactions, clients, approveChargeback, rejectChargeback } = useSupabase()
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [processing, setProcessing] = useState<string | null>(null)

  const filteredChargebacks = chargebacks.filter((cb) => {
    if (filter === "all") return true
    return cb.status === filter
  })

  const getTransaction = (transactionId: string) => {
    return transactions.find((t) => t.id === transactionId)
  }

  const getClientName = (userId: string) => {
    const client = clients.find((c) => c.id === userId)
    return client?.full_name || "Cliente Desconhecido"
  }

  const handleApprove = async (chargebackId: string) => {
    setProcessing(chargebackId)
    try {
      await approveChargeback(chargebackId)
      toast.success("Estorno aprovado com sucesso")
    } catch (error) {
      console.error("Erro ao aprovar estorno:", error)
      toast.error("Erro ao aprovar estorno")
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (chargebackId: string) => {
    setProcessing(chargebackId)
    try {
      await rejectChargeback(chargebackId)
      toast.success("Estorno rejeitado")
    } catch (error) {
      console.error("Erro ao rejeitar estorno:", error)
      toast.error("Erro ao rejeitar estorno")
    } finally {
      setProcessing(null)
    }
  }

  const pendingCount = chargebacks.filter((cb) => cb.status === "pending").length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estornos</h1>
          <p className="text-muted-foreground mt-1">Gerencie solicitações de estorno dos clientes</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-amber-500">{pendingCount} pendentes</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
          className={filter === "pending" ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          Pendentes ({chargebacks.filter((cb) => cb.status === "pending").length})
        </Button>
        <Button variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>
          Aprovados ({chargebacks.filter((cb) => cb.status === "approved").length})
        </Button>
        <Button variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>
          Rejeitados ({chargebacks.filter((cb) => cb.status === "rejected").length})
        </Button>
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Todos ({chargebacks.length})
        </Button>
      </div>

      {/* Chargebacks List */}
      <GlassCard className="p-6">
        {filteredChargebacks.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum estorno {filter !== "all" ? filter : "encontrado"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredChargebacks.map((chargeback) => {
                const transaction = getTransaction(chargeback.transaction_id)
                if (!transaction) return null

                const statusColors = {
                  pending: "border-amber-500/30 bg-amber-500/10",
                  approved: "border-emerald-500/30 bg-emerald-500/10",
                  rejected: "border-rose-500/30 bg-rose-500/10",
                }

                const statusLabels = {
                  pending: "Aguardando Aprovação",
                  approved: "Aprovado",
                  rejected: "Rejeitado",
                }

                return (
                  <motion.div
                    key={chargeback.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-lg border ${statusColors[chargeback.status as keyof typeof statusColors]}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{formatCurrency(transaction.gross_value)}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              chargeback.status === "pending"
                                ? "bg-amber-500/20 text-amber-500"
                                : chargeback.status === "approved"
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-rose-500/20 text-rose-500"
                            }`}
                          >
                            {statusLabels[chargeback.status as keyof typeof statusLabels]}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-medium">Cliente:</span> {getClientName(chargeback.user_id)}
                          </p>
                          <p>
                            <span className="font-medium">Transação:</span> {formatBrandName(transaction.brand)} -{" "}
                            {formatPaymentType(transaction.payment_type, transaction.installments)}
                          </p>
                          <p>
                            <span className="font-medium">Valor Líquido:</span> {formatCurrency(transaction.net_value)}
                          </p>
                          <p>
                            <span className="font-medium">Solicitado em:</span>{" "}
                            {new Date(chargeback.created_at).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(chargeback.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {chargeback.reason && (
                            <p className="mt-2 p-2 rounded bg-background/50">
                              <span className="font-medium">Motivo:</span> {chargeback.reason}
                            </p>
                          )}
                          {chargeback.reviewed_at && (
                            <p className="text-xs mt-2">
                              Revisado em {new Date(chargeback.reviewed_at).toLocaleDateString("pt-BR")} às{" "}
                              {new Date(chargeback.reviewed_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {chargeback.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(chargeback.id)}
                            disabled={processing === chargeback.id}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {processing === chargeback.id ? "Aprovando..." : "Aprovar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(chargeback.id)}
                            disabled={processing === chargeback.id}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-500"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {processing === chargeback.id ? "Rejeitando..." : "Rejeitar"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
