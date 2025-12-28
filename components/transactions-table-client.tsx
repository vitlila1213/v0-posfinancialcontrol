"use client"

import { useState } from "react"
import { Eye, Upload, FileText, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/pos-rates"
import { useSupabase } from "@/lib/supabase-context"
import type { Transaction } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_receipt: { label: "Aguardando Comprovante", color: "bg-amber-500/20 text-amber-500" },
  pending_verification: { label: "Em Verificação", color: "bg-blue-500/20 text-blue-500" },
  verified: { label: "Verificado", color: "bg-emerald-500/20 text-emerald-500" },
  rejected: { label: "Rejeitado", color: "bg-rose-500/20 text-rose-500" },
  paid: { label: "Pago", color: "bg-purple-500/20 text-purple-500" },
  chargeback: { label: "Estornado", color: "bg-red-500/20 text-red-500" },
}

interface Props {
  transactions: Transaction[]
  onChargeback?: (transaction: Transaction) => void
}

export function TransactionsTableClient({ transactions, onChargeback }: Props) {
  const { uploadReceipt } = useSupabase()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // ========================================
  // VERSÃO COM DEBUG COMPLETO PARA IPHONE
  // ========================================
  const handleFileSelect = async (transactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // CHECKPOINT 1
      setDebugInfo("1️⃣ Função chamada")
      await new Promise(resolve => setTimeout(resolve, 100))

      const file = event.target.files?.[0]
      
      // CHECKPOINT 2
      if (!file) {
        setDebugInfo("❌ Nenhum arquivo detectado!")
        alert("❌ ERRO: Nenhum arquivo foi selecionado")
        return
      }

      setDebugInfo(`2️⃣ Arquivo detectado: ${file.name} (${(file.size/1024).toFixed(1)}KB)`)
      await new Promise(resolve => setTimeout(resolve, 500))

      setUploadingId(transactionId)

      // CHECKPOINT 3 - Ler o arquivo
      setDebugInfo("3️⃣ Lendo arquivo...")
      await new Promise(resolve => setTimeout(resolve, 100))

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          setDebugInfo("4️⃣ Arquivo lido com sucesso!")
          resolve(reader.result as string)
        }
        reader.onerror = () => {
          setDebugInfo("❌ Erro ao ler arquivo")
          reject(new Error("Erro ao ler arquivo"))
        }
        reader.readAsDataURL(file)
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      // CHECKPOINT 4 - Enviar
      setDebugInfo("5️⃣ Enviando para servidor...")
      await new Promise(resolve => setTimeout(resolve, 100))

      await uploadReceipt(transactionId, file)

      // SUCESSO
      setDebugInfo("✅ SUCESSO!")
      alert("✅ Comprovante enviado com sucesso!")
      
    } catch (error: any) {
      const errorMsg = error.message || JSON.stringify(error)
      setDebugInfo(`❌ ERRO: ${errorMsg}`)
      alert(`❌ ERRO: ${errorMsg}`)
      console.error("Erro completo:", error)
    } finally {
      setUploadingId(null)
      event.target.value = ""
    }
  }

  // FUNÇÃO DE TESTE SIMPLIFICADA
  const testImageSelection = async (transactionId: string) => {
    alert("🧪 Iniciando teste de seleção de imagem...")
    
    const input = document.getElementById(`upload-${transactionId}`) as HTMLInputElement
    if (!input) {
      alert("❌ Input não encontrado!")
      return
    }
    
    input.click()
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const status = statusConfig[tx.status] || statusConfig.pending_receipt
        const isExpanded = expandedId === tx.id

        return (
          <div key={tx.id} className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
            <div
              className="flex cursor-pointer items-center justify-between p-4"
              onClick={() => setExpandedId(isExpanded ? null : tx.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <FileText className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{formatCurrency(tx.gross_value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.brand === "visa_master" ? "Visa/Master" : "Elo/Amex"} -{" "}
                    {tx.payment_type === "debit" ? "Débito" : `Crédito ${tx.installments}x`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.color}`}>{status.label}</span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5"
                >
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Bruto</p>
                        <p className="font-medium text-foreground">{formatCurrency(tx.gross_value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Líquido</p>
                        <p className="font-medium text-emerald-500">{formatCurrency(tx.net_value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taxa</p>
                        <p className="font-medium text-rose-500">
                          {formatCurrency(tx.fee_value)} ({tx.fee_percentage.toFixed(2)}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-medium text-foreground">
                          {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    {/* DEBUG INFO */}
                    {debugInfo && uploadingId === tx.id && (
                      <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/30">
                        <p className="text-sm text-blue-400 font-mono">{debugInfo}</p>
                      </div>
                    )}

                    {/* UPLOAD AREA */}
                    {tx.status === "pending_receipt" && (
                      <div className="space-y-3">
                        {tx.no_receipt_reason && (
                          <div className="rounded-lg bg-amber-500/10 p-3">
                            <p className="text-xs text-amber-500">
                              <strong>Motivo informado:</strong> {tx.no_receipt_reason}
                            </p>
                          </div>
                        )}

                        {/* BOTÃO VISÍVEL PARA TESTE */}
                        <button
                          onClick={() => testImageSelection(tx.id)}
                          disabled={uploadingId === tx.id}
                          className="w-full rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/10 p-6 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-amber-500" />
                            <span className="text-base font-medium text-amber-500">
                              {uploadingId === tx.id ? debugInfo : "Toque para enviar comprovante"}
                            </span>
                            <span className="text-xs text-amber-500/60">
                              JPG, PNG ou PDF
                            </span>
                          </div>
                        </button>

                        {/* INPUT OCULTO */}
                        <input
                          type="file"
                          id={`upload-${tx.id}`}
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileSelect(tx.id, e)}
                          className="hidden"
                          disabled={uploadingId === tx.id}
                        />
                      </div>
                    )}

                    {tx.receipt_url && (
                      <div className="flex items-center gap-2 rounded-lg bg-white/5 p-3">
                        <FileText className="h-5 w-5 text-emerald-500" />
                        <span className="flex-1 text-sm text-foreground">Comprovante anexado</span>
                        <a
                          href={tx.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-emerald-500 hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </a>
                      </div>
                    )}

                    {tx.status === "rejected" && tx.rejection_reason && (
                      <div className="rounded-lg bg-rose-500/10 p-3">
                        <p className="text-sm text-rose-400">
                          <strong>Motivo da rejeição:</strong> {tx.rejection_reason}
                        </p>
                      </div>
                    )}

                    {!tx.is_chargeback && onChargeback && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onChargeback(tx)
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/20"
                      >
                        <AlertCircle className="h-4 w-4" />
                        Registrar Estorno
                      </button>
                    )}

                    {tx.is_chargeback && tx.chargeback_reason && (
                      <div className="rounded-lg bg-red-500/10 p-3">
                        <p className="text-sm text-red-400">
                          <strong>Motivo do estorno:</strong> {tx.chargeback_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
