"use client"

import { useState, useEffect } from "react"
import { Search, Check, X, Eye, FileText, User } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/pos-rates"
import { formatBrandName, formatPaymentType } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { Transaction } from "@/lib/types"
import { AdminVoiceAssistantButton } from "@/components/admin-voice-assistant-button"
import type { AdminVoiceCommand } from "@/app/actions/admin-voice-assistant"
import { toast } from "sonner"

export default function AdminComprovantesPage() {
  const { transactions, clients, verifyTransaction, rejectTransaction, chargebacks, approveChargeback, isLoading } = useSupabase()
  const [search, setSearch] = useState("")
  const [filterBrand, setFilterBrand] = useState<string>("all")
  const [filterPaymentType, setFilterPaymentType] = useState<string>("all")
  const [filterChargeback, setFilterChargeback] = useState<string>("all")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [approvingChargebackId, setApprovingChargebackId] = useState<string | null>(null)

  const handleVoiceCommand = (command: AdminVoiceCommand) => {
    console.log("[v0] Comprovantes comando recebido:", command)

    if (command.intent === "approve_receipt") {
      if (selectedTransaction) {
        handleApprove(selectedTransaction.id)
        toast.success("Comprovante aprovado por voz")
        setSelectedTransaction(null)
      } else if (transactions.length > 0) {
        handleApprove(transactions[0].id)
        toast.success("Primeiro comprovante aprovado")
      } else {
        toast.info("Nenhum comprovante para aprovar")
      }
    } else if (command.intent === "reject_receipt") {
      if (selectedTransaction) {
        setShowRejectModal(true)
        toast.info("Informe o motivo da rejeição")
      } else if (transactions.length > 0) {
        setSelectedTransaction(transactions[0])
        setShowRejectModal(true)
        toast.info("Informe o motivo da rejeição")
      } else {
        toast.info("Nenhum comprovante para rejeitar")
      }
    } else if (command.intent === "unknown") {
      toast.error("Comando não reconhecido. Diga 'aprovar' ou 'rejeitar'")
    }
  }

  useEffect(() => {
    if (selectedTransaction || showRejectModal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [selectedTransaction, showRejectModal])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const pendingReceipts = transactions.filter(
    (t) => t.status === "pending_verification" || t.status === "pending_receipt",
  )

  const getClientName = (userId: string) => {
    const client = clients.find((c) => c.id === userId)
    return client?.full_name || client?.email || "Cliente"
  }

  const handleApprove = async (transactionId: string) => {
    setApprovingId(transactionId)
    try {
      await verifyTransaction(transactionId, "approved")
      toast.success("Comprovante aprovado com sucesso")
      setSelectedTransaction(null) // Fechar modal após aprovação
    } catch (error) {
      console.error("Erro ao aprovar comprovante:", error)
      toast.error("Erro ao aprovar comprovante")
    } finally {
      setApprovingId(null)
    }
  }

  const handleApproveChargeback = async (chargebackId: string) => {
    setApprovingChargebackId(chargebackId)
    try {
      await approveChargeback(chargebackId)
      toast.success("Estorno aprovado - valor não será creditado ao cliente")
    } catch (error) {
      console.error("Erro ao aprovar estorno:", error)
      toast.error("Erro ao aprovar estorno")
    } finally {
      setApprovingChargebackId(null)
    }
  }

  const handleReject = async () => {
    if (selectedTransaction) {
      setRejectingId(selectedTransaction.id)
      try {
        await rejectTransaction(selectedTransaction.id, rejectReason)
        toast.success("Transação rejeitada com sucesso")
        setShowRejectModal(false)
        setSelectedTransaction(null)
        setRejectReason("")
      } catch (error) {
        console.error("[v0] Erro ao rejeitar transação:", error)
        toast.error("Erro ao rejeitar transação")
      } finally {
        setRejectingId(null)
      }
    }
  }

  const filteredReceipts = pendingReceipts.filter((t) => {
    const matchesSearch = search === "" || getClientName(t.user_id).toLowerCase().includes(search.toLowerCase())

    const matchesBrand = filterBrand === "all" || t.brand === filterBrand

    const matchesPaymentType = filterPaymentType === "all" || t.payment_type === filterPaymentType

    // Verificar se a transação tem chargeback pendente
    const hasChargeback = chargebacks.some((cb) => cb.transaction_id === t.id && cb.status === "pending")
    const matchesChargeback =
      filterChargeback === "all" ||
      (filterChargeback === "chargeback" && hasChargeback) ||
      (filterChargeback === "normal" && !hasChargeback)

    return matchesSearch && matchesBrand && matchesPaymentType && matchesChargeback
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Comprovantes</h1>
          <p className="text-sm text-muted-foreground">Verifique os comprovantes enviados</p>
        </div>
        <AdminVoiceAssistantButton onCommand={handleVoiceCommand} />
      </div>

      <GlassCard className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">
            Aguardando Verificação ({filteredReceipts.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-white/10 bg-white/5 pl-9"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterBrand("all")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterBrand === "all" ? "bg-amber-500 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Todas Bandeiras
            </button>
            <button
              onClick={() => setFilterBrand("visa_master")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterBrand === "visa_master"
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Visa/Master
            </button>
            <button
              onClick={() => setFilterBrand("elo_amex")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterBrand === "elo_amex"
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Elo/Amex
            </button>
            <button
              onClick={() => setFilterBrand("pix")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterBrand === "pix" ? "bg-amber-500 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              PIX
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPaymentType("all")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterPaymentType === "all"
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Todos Tipos
            </button>
            <button
              onClick={() => setFilterPaymentType("debit")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterPaymentType === "debit"
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Débito
            </button>
            <button
              onClick={() => setFilterPaymentType("credit")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterPaymentType === "credit"
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Crédito
            </button>
            <button
              onClick={() => setFilterPaymentType("pix")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterPaymentType === "pix"
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              PIX
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterChargeback("all")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterChargeback === "all"
                  ? "bg-rose-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Todos Status
            </button>
            <button
              onClick={() => setFilterChargeback("normal")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterChargeback === "normal"
                  ? "bg-rose-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setFilterChargeback("chargeback")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filterChargeback === "chargeback"
                  ? "bg-rose-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Com Estorno Pendente
            </button>
          </div>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum comprovante encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReceipts.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                    <User className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{getClientName(tx.user_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBrandName(tx.brand)} - {formatPaymentType(tx.payment_type, tx.installments)}
                    </p>
                    {chargebacks.some((cb) => cb.transaction_id === tx.id && cb.status === "pending") && (
                      <span className="mt-1 inline-block rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-500">
                        ⚠️ Estorno Solicitado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-center sm:text-right">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(tx.gross_value)}</p>
                  <p className="text-xs text-muted-foreground">Líquido: {formatCurrency(tx.net_value)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTransaction(tx)}
                    className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                    Ver
                  </button>
                  {(() => {
                    const pendingChargeback = chargebacks.find(
                      (cb) => cb.transaction_id === tx.id && cb.status === "pending"
                    )
                    
                    if (pendingChargeback) {
                      return (
                        <button
                          onClick={() => handleApproveChargeback(pendingChargeback.id)}
                          disabled={approvingChargebackId === pendingChargeback.id}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-500 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          {approvingChargebackId === pendingChargeback.id ? "Aprovando..." : "Aprovar Estorno"}
                        </button>
                      )
                    }
                    
                    return (
                      <button
                        onClick={() => handleApprove(tx.id)}
                        disabled={approvingId === tx.id}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-500 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {approvingId === tx.id ? "Aprovando..." : "Aprovar"}
                      </button>
                    )
                  })()}
                  <button
                    onClick={() => {
                      setSelectedTransaction(tx)
                      setShowRejectModal(true)
                    }}
                    className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-500 transition-colors hover:bg-rose-500/30"
                  >
                    <X className="h-4 w-4" />
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {selectedTransaction && !showRejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedTransaction(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto max-h-[90vh] overflow-y-auto"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Comprovante</h2>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="text-foreground">{getClientName(selectedTransaction.user_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Bruto:</span>
                    <span className="text-foreground">{formatCurrency(selectedTransaction.gross_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Líquido:</span>
                    <span className="text-emerald-500">{formatCurrency(selectedTransaction.net_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa:</span>
                    <span className="text-rose-500">
                      {formatCurrency(selectedTransaction.fee_value)} ({selectedTransaction.fee_percentage.toFixed(2)}%)
                    </span>
                  </div>

                  {selectedTransaction.no_receipt_reason && !selectedTransaction.receipt_url && (
                    <div className="rounded-lg bg-amber-500/10 p-3 mt-3">
                      <p className="text-sm text-amber-400">
                        <strong>Cliente informou:</strong> {selectedTransaction.no_receipt_reason}
                      </p>
                      <p className="text-xs text-amber-500/70 mt-1">
                        Cliente não possui comprovante. Você pode aprovar baseado nesta justificativa.
                      </p>
                    </div>
                  )}
                </div>

                {selectedTransaction.receipt_url && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Arquivo do Comprovante:</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-8 w-8 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">comprovante.pdf</p>
                        <a
                          href={selectedTransaction.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-500 hover:underline"
                        >
                          Abrir arquivo
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedTransaction.id)}
                    disabled={approvingId === selectedTransaction.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="h-4 w-4" />
                    {approvingId === selectedTransaction.id ? "Aprovado" : "Aprovar"}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={approvingId === selectedTransaction.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                    Rejeitar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRejectModal && selectedTransaction && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setShowRejectModal(false)
                setSelectedTransaction(null)
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto max-h-[90vh] overflow-y-auto"
              >
                <h2 className="mb-4 text-lg font-bold text-foreground">Rejeitar Comprovante</h2>

                <div className="mb-4">
                  <label className="mb-2 block text-sm text-muted-foreground">Motivo da rejeição:</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Informe o motivo..."
                    className="h-24 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false)
                      setSelectedTransaction(null)
                    }}
                    disabled={rejectingId === selectedTransaction.id}
                    className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectingId === selectedTransaction.id}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rejectingId === selectedTransaction.id ? "Rejeitado" : "Confirmar Rejeição"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
