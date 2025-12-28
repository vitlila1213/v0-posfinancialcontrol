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
  const [progress, setProgress] = useState<string>("")

  // ========================================
  // COMPRESSÃO DE IMAGEM PARA IPHONE
  // ========================================
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          // Criar canvas para redimensionar
          const canvas = document.createElement('canvas')
          
          // Definir tamanho máximo (mantém proporção)
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          
          let width = img.width
          let height = img.height
          
          // Calcular novo tamanho mantendo proporção
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height
              height = MAX_HEIGHT
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Erro ao criar contexto'))
            return
          }
          
          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height)
          
          // Converter para Blob com compressão (0.7 = 70% qualidade)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erro ao comprimir'))
                return
              }
              
              // Criar novo File a partir do Blob
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
              })
              
              resolve(compressedFile)
            },
            'image/jpeg',
            0.7 // 70% de qualidade (reduz muito o tamanho)
          )
        }
        
        img.onerror = () => reject(new Error('Erro ao carregar imagem'))
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (transactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingId(transactionId)
    setProgress("Processando imagem...")

    try {
      let processedFile = file

      // Se for imagem, comprimir
      if (file.type.startsWith('image/')) {
        const originalSize = (file.size / 1024).toFixed(0)
        setProgress(`Imagem original: ${originalSize}KB. Comprimindo...`)
        
        processedFile = await compressImage(file)
        
        const compressedSize = (processedFile.size / 1024).toFixed(0)
        setProgress(`Comprimido: ${compressedSize}KB. Enviando...`)
        
        // Aguardar um pouco para usuário ver a mensagem
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        setProgress("Enviando PDF...")
      }

      // Verificar se ainda está abaixo de 1MB
      if (processedFile.size > 1024 * 1024) {
        throw new Error(`Arquivo ainda muito grande: ${(processedFile.size / 1024 / 1024).toFixed(1)}MB. Máximo: 1MB`)
      }

      await uploadReceipt(transactionId, processedFile)

      setProgress("✅ Enviado!")
      alert("✅ Comprovante enviado com sucesso!")
      
    } catch (error: any) {
      console.error("Erro:", error)
      setProgress("")
      alert(`❌ Erro: ${error.message}`)
    } finally {
      setTimeout(() => {
        setUploadingId(null)
        setProgress("")
      }, 1000)
      event.target.value = ""
    }
  }

  const triggerFileInput = (transactionId: string) => {
    const input = document.getElementById(`upload-${transactionId}`) as HTMLInputElement
    input?.click()
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

                    {tx.status === "pending_receipt" && (
                      <div className="space-y-3">
                        {tx.no_receipt_reason && (
                          <div className="rounded-lg bg-amber-500/10 p-3">
                            <p className="text-xs text-amber-500">
                              <strong>Motivo informado:</strong> {tx.no_receipt_reason}
                            </p>
                          </div>
                        )}

                        {/* PROGRESSO */}
                        {uploadingId === tx.id && progress && (
                          <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/30">
                            <p className="text-sm text-blue-400 text-center font-medium">{progress}</p>
                          </div>
                        )}

                        {/* BOTÃO DE UPLOAD */}
                        <button
                          onClick={() => triggerFileInput(tx.id)}
                          disabled={uploadingId === tx.id}
                          className="w-full rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/10 p-6 hover:bg-amber-500/20 transition-colors disabled:opacity-50 active:scale-98"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-amber-500" />
                            <span className="text-base font-medium text-amber-500">
                              {uploadingId === tx.id ? "Processando..." : "Enviar Comprovante"}
                            </span>
                            <span className="text-xs text-amber-500/60">
                              Fotos são comprimidas automaticamente
                            </span>
                          </div>
                        </button>

                        {/* INPUT OCULTO */}
                        <input
                          type="file"
                          id={`upload-${tx.id}`}
                          accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,application/pdf"
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
