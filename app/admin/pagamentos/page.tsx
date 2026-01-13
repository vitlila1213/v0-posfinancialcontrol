"use client"

import { useState } from "react"
import { Search, Wallet, Upload, MessageCircle, User, X, Loader2, FileText, CreditCard, QrCode } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/pos-rates"
import { motion, AnimatePresence } from "framer-motion"
import type { Withdrawal } from "@/lib/types"

export default function AdminPagamentosPage() {
  const { withdrawals, clients, payWithdrawal, cancelWithdrawal, isLoading } = useSupabase()
  const [search, setSearch] = useState("")
  const [filterMethod, setFilterMethod] = useState<string>("all")
  const [paidSearch, setPaidSearch] = useState("")
  const [paidFilterMethod, setPaidFilterMethod] = useState<string>("all")
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending")
  const paidWithdrawals = withdrawals.filter((w) => w.status === "paid")
  const cancelledWithdrawals = withdrawals.filter((w) => w.status === "cancelled")

  const getClient = (userId: string) => {
    return clients.find((c) => c.id === userId)
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "pix":
        return <QrCode className="h-4 w-4" />
      case "bank":
        return <CreditCard className="h-4 w-4" />
      case "boleto":
        return <FileText className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "pix":
        return "PIX"
      case "bank":
        return "Transferência Bancária"
      case "boleto":
        return "Pagamento de Boleto"
      default:
        return "Saque"
    }
  }

  const getPixKeyTypeLabel = (type: string | null) => {
    switch (type) {
      case "cpf":
        return "CPF"
      case "phone":
        return "Telefone"
      case "email":
        return "E-mail"
      case "random":
        return "Aleatória"
      default:
        return ""
    }
  }

  const handlePay = async () => {
    if (!selectedWithdrawal || !proofFile) return

    setProcessing(true)
    try {
      const proofUrl = URL.createObjectURL(proofFile)
      await payWithdrawal(selectedWithdrawal.id, proofUrl)
      setSelectedWithdrawal(null)
      setProofFile(null)
    } catch (error) {
      console.error("Erro ao processar pagamento:", error)
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedWithdrawal || !cancelReason.trim()) return

    setProcessing(true)
    try {
      await cancelWithdrawal(selectedWithdrawal.id, cancelReason)
      setSelectedWithdrawal(null)
      setShowCancelModal(false)
      setCancelReason("")
    } catch (error) {
      console.error("Erro ao cancelar saque:", error)
    } finally {
      setProcessing(false)
    }
  }

  const sendWhatsApp = (withdrawal: Withdrawal) => {
    const client = getClient(withdrawal.user_id)
    if (!client?.phone) return

    const phone = client.phone.replace(/\D/g, "")
    const message = encodeURIComponent(
      `Olá ${client.full_name || "Cliente"}! Seu saque de ${formatCurrency(withdrawal.amount)} foi processado e o pagamento foi realizado. Obrigado!`,
    )
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank")
  }

  const filteredPendingWithdrawals = pendingWithdrawals.filter((w) => {
    const client = getClient(w.user_id)
    const matchesSearch =
      search === "" ||
      client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      client?.email?.toLowerCase().includes(search.toLowerCase())

    const matchesMethod = filterMethod === "all" || w.withdrawal_method === filterMethod

    return matchesSearch && matchesMethod
  })

  const filteredPaidWithdrawals = paidWithdrawals.filter((w) => {
    const client = getClient(w.user_id)
    const matchesSearch =
      paidSearch === "" ||
      client?.full_name?.toLowerCase().includes(paidSearch.toLowerCase()) ||
      client?.email?.toLowerCase().includes(paidSearch.toLowerCase())

    const matchesMethod = paidFilterMethod === "all" || w.withdrawal_method === paidFilterMethod

    return matchesSearch && matchesMethod
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Gerencie os saques solicitados</p>
      </div>

      {/* Pending Withdrawals */}
      <GlassCard className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">
            Saques Pendentes ({filteredPendingWithdrawals.length})
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
          <button
            onClick={() => setFilterMethod("all")}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filterMethod === "all" ? "bg-amber-500 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            Todos Métodos
          </button>
          <button
            onClick={() => setFilterMethod("pix")}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filterMethod === "pix" ? "bg-amber-500 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            PIX
          </button>
          <button
            onClick={() => setFilterMethod("bank")}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filterMethod === "bank" ? "bg-amber-500 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            Transferência
          </button>
          <button
            onClick={() => setFilterMethod("boleto")}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filterMethod === "boleto"
                ? "bg-amber-500 text-white"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            Boleto
          </button>
        </div>

        {filteredPendingWithdrawals.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum saque encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPendingWithdrawals.map((withdrawal) => {
              const client = getClient(withdrawal.user_id)

              return (
                <div
                  key={withdrawal.id}
                  className="flex flex-col gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                      <User className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{client?.full_name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">{client?.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                        {getMethodIcon(withdrawal.withdrawal_method)}
                        <span>{getMethodLabel(withdrawal.withdrawal_method)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <p className="text-xl font-bold text-amber-500">{formatCurrency(withdrawal.amount)}</p>
                    {withdrawal.pix_key && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          PIX ({getPixKeyTypeLabel(withdrawal.pix_key_type)}): {withdrawal.pix_key}
                        </p>
                        {withdrawal.pix_owner_name && (
                          <p className="text-sm text-muted-foreground">Titular: {withdrawal.pix_owner_name}</p>
                        )}
                      </>
                    )}
                    {withdrawal.bank_name && (
                      <p className="text-xs text-muted-foreground">
                        {withdrawal.bank_name} - Ag: {withdrawal.bank_agency} / CC: {withdrawal.bank_account}
                      </p>
                    )}
                    {withdrawal.boleto_number && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>Boleto: {withdrawal.boleto_name}</p>
                        <p>Origem: {withdrawal.boleto_origin}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedWithdrawal(withdrawal)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      <Upload className="h-4 w-4" />
                      Pagar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWithdrawal(withdrawal)
                        setShowCancelModal(true)
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Paid Withdrawals */}
      {paidWithdrawals.length > 0 && (
        <GlassCard className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              Saques Pagos ({filteredPaidWithdrawals.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={paidSearch}
                onChange={(e) => setPaidSearch(e.target.value)}
                className="border-white/10 bg-white/5 pl-9"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setPaidFilterMethod("all")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                paidFilterMethod === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Todos Métodos
            </button>
            <button
              onClick={() => setPaidFilterMethod("pix")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                paidFilterMethod === "pix"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              PIX
            </button>
            <button
              onClick={() => setPaidFilterMethod("bank")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                paidFilterMethod === "bank"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Transferência
            </button>
            <button
              onClick={() => setPaidFilterMethod("boleto")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                paidFilterMethod === "boleto"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Boleto
            </button>
          </div>

          {filteredPaidWithdrawals.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum saque pago encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPaidWithdrawals.slice(0, 10).map((withdrawal) => {
                const client = getClient(withdrawal.user_id)

                return (
                  <div
                    key={withdrawal.id}
                    className="flex flex-col gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                        <User className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client?.full_name || "Cliente"}</p>
                        <p className="text-xs text-muted-foreground">
                          Pago em {new Date(withdrawal.paid_at!).toLocaleDateString("pt-BR")}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
                          {getMethodIcon(withdrawal.withdrawal_method)}
                          <span>{getMethodLabel(withdrawal.withdrawal_method)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xl font-bold text-emerald-500">{formatCurrency(withdrawal.amount)}</p>

                    {client?.phone && (
                      <button
                        onClick={() => sendWhatsApp(withdrawal)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      )}

      {/* Cancelled Withdrawals */}
      {cancelledWithdrawals.length > 0 && (
        <GlassCard className="p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground sm:text-lg">
            Saques Cancelados ({cancelledWithdrawals.length})
          </h3>

          <div className="space-y-3">
            {cancelledWithdrawals.slice(0, 10).map((withdrawal) => {
              const client = getClient(withdrawal.user_id)

              return (
                <div
                  key={withdrawal.id}
                  className="flex flex-col gap-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20">
                      <User className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{client?.full_name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">Cancelado</p>
                    </div>
                  </div>

                  <p className="text-xl font-bold text-rose-500">{formatCurrency(withdrawal.amount)}</p>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Pay Modal */}
      <AnimatePresence>
        {selectedWithdrawal && !showCancelModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedWithdrawal(null)}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Processar Pagamento</h2>
                  <button
                    onClick={() => setSelectedWithdrawal(null)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 rounded-xl bg-amber-500/10 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Valor do Saque</p>
                  <p className="text-2xl font-bold text-amber-500">{formatCurrency(selectedWithdrawal.amount)}</p>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-amber-500">
                    {getMethodIcon(selectedWithdrawal.withdrawal_method)}
                    <span>{getMethodLabel(selectedWithdrawal.withdrawal_method)}</span>
                  </div>
                </div>

                {(selectedWithdrawal.pix_key || selectedWithdrawal.bank_name || selectedWithdrawal.boleto_number) && (
                  <div className="mb-4 space-y-2 rounded-xl bg-white/5 p-4">
                    <p className="text-sm font-medium text-foreground">Dados para Pagamento:</p>
                    {selectedWithdrawal.pix_key && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Tipo de Chave: {getPixKeyTypeLabel(selectedWithdrawal.pix_key_type)}
                        </p>
                        <p className="text-sm text-muted-foreground">Chave PIX: {selectedWithdrawal.pix_key}</p>
                        {selectedWithdrawal.pix_owner_name && (
                          <p className="text-sm text-muted-foreground">Titular: {selectedWithdrawal.pix_owner_name}</p>
                        )}
                      </>
                    )}
                    {selectedWithdrawal.bank_name && (
                      <>
                        <p className="text-sm text-muted-foreground">Banco: {selectedWithdrawal.bank_name}</p>
                        <p className="text-sm text-muted-foreground">Agência: {selectedWithdrawal.bank_agency}</p>
                        <p className="text-sm text-muted-foreground">Conta: {selectedWithdrawal.bank_account}</p>
                      </>
                    )}
                    {selectedWithdrawal.boleto_number && (
                      <>
                        <p className="text-sm font-medium text-foreground mt-2">Dados do Boleto:</p>
                        <p className="text-sm text-muted-foreground">Nome: {selectedWithdrawal.boleto_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Beneficiário: {selectedWithdrawal.boleto_beneficiary_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Código de Barras: {selectedWithdrawal.boleto_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Valor: {formatCurrency(selectedWithdrawal.boleto_value || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Origem: {selectedWithdrawal.boleto_origin}</p>
                      </>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-2 block text-sm text-muted-foreground">Comprovante de Pagamento *</label>
                  <div className="rounded-xl border-2 border-dashed border-white/10 p-4 text-center transition-colors hover:border-emerald-500/50">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="h-5 w-5 text-emerald-500" />
                          <span className="text-sm text-emerald-500">{proofFile.name}</span>
                        </div>
                      ) : (
                        <div>
                          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Clique para anexar o comprovante</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <button
                  onClick={handlePay}
                  disabled={!proofFile || processing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      Confirmar Pagamento
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </>
        )}

        {selectedWithdrawal && showCancelModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setShowCancelModal(false)
                setSelectedWithdrawal(null)
                setCancelReason("")
              }}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Cancelar Saque</h2>
                  <button
                    onClick={() => {
                      setShowCancelModal(false)
                      setSelectedWithdrawal(null)
                      setCancelReason("")
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 rounded-xl bg-rose-500/10 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Valor do Saque</p>
                  <p className="text-2xl font-bold text-rose-500">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm text-muted-foreground">Motivo do Cancelamento *</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Digite o motivo do cancelamento..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    rows={4}
                  />
                </div>

                <button
                  onClick={handleCancel}
                  disabled={!cancelReason.trim() || processing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Confirmar Cancelamento
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
