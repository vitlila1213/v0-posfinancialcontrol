"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSupabase } from "@/lib/supabase-context"
import type { Transaction } from "@/lib/types"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/pos-rates"

interface ChargebackModalProps {
  transaction: Transaction | null
  onClose: () => void
}

export function ChargebackModal({ transaction, onClose }: ChargebackModalProps) {
  const { registerChargeback } = useSupabase()
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (transaction) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [transaction])

  if (!transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast.error("Informe o motivo do estorno")
      return
    }

    setIsSubmitting(true)

    try {
      await registerChargeback(transaction.id, reason)
      toast.success("Solicitação de estorno enviada para aprovação")
      onClose()
    } catch (error) {
      console.error("Erro ao solicitar estorno:", error)
      toast.error("Erro ao solicitar estorno")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Registrar Estorno</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-500">Solicitação de Estorno</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sua solicitação será enviada para análise do administrador. O valor de {formatCurrency(transaction.net_value)} será removido apenas após aprovação.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-lg bg-white/5 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Bruto</span>
              <span className="font-medium text-foreground">{formatCurrency(transaction.gross_value)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Líquido</span>
              <span className="font-medium text-emerald-500">{formatCurrency(transaction.net_value)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium text-foreground">
                {transaction.payment_type === "debit"
                  ? "Débito"
                  : transaction.payment_type === "credit"
                    ? `Crédito ${transaction.installments}x`
                    : transaction.payment_type === "pix_conta"
                      ? "PIX Conta"
                      : "PIX QR Code"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="reason" className="text-sm text-muted-foreground">
                Motivo do Estorno
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Cancelamento pelo cliente, fraude, erro no lançamento, etc."
                className="mt-2 min-h-[100px] border-white/10 bg-white/5"
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 bg-white/5">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-amber-500 text-white hover:bg-amber-600">
                {isSubmitting ? "Enviando..." : "Solicitar Estorno"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
