"use client"

import { useState } from "react"
import { Eye, Upload, FileText, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/pos-rates"
import { useSupabase } from "@/lib/supabase-context"
import type { Transaction } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"

// --- STATUS CONFIG ---
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

  // ========================================
  // CORREÇÃO PRINCIPAL PARA IPHONE
  // ========================================
  const handleFileSelect = async (transactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log('📱 Arquivo selecionado:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    setUploadingId(transactionId)

    try {
      // PASSO 1: Converter HEIC para JPEG se necessário (iPhone usa HEIC)
      let processedFile = file
      
      // Se for HEIC ou imagem sem tipo definido, tentamos converter
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.type === '') {
        console.log('🔄 Convertendo formato de imagem...')
        processedFile = await convertToJpeg(file)
      }

      // PASSO 2: Converter para Base64 (mais compatível com iOS)
      const base64 = await fileToBase64(processedFile)
      
      console.log('✅ Arquivo processado, enviando...')

      // PASSO 3: Enviar o arquivo processado
      // Você pode enviar tanto o File quanto o Base64, dependendo da sua função uploadReceipt
      await uploadReceipt(transactionId, processedFile)

      alert("✅ Comprovante enviado com sucesso!")
      
    } catch (error: any) {
      console.error("❌ Erro detalhado:", error)
      alert(`Erro ao enviar: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setUploadingId(null)
      event.target.value = ""
    }
  }

  // Função auxiliar para converter arquivo para Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  // Função auxiliar para converter HEIC/HEIF para JPEG
  const convertToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Criar canvas para conversão
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Erro ao criar contexto do canvas'))
            return
          }
          
          // Desenhar imagem no canvas
          ctx.drawImage(img, 0, 0)
          
          // Converter para Blob JPEG
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Erro ao converter imagem'))
              return
            }
            
            // Criar novo File a partir do Blob
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
            })
            
            resolve(newFile)
          }, 'image/jpeg', 0.9)
        }
        
        img.onerror = () => reject(new Error('Erro ao carregar imagem'))
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      reader.readAsDataURL(file)
    })
  }

  // --- RENDERIZAÇÃO ---
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
                    {/* Infos Financeiras */}
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

                    {/* Área de Upload - CORRIGIDA PARA iOS */}
                    {tx.status === "pending_receipt" && (
                      <div className="space-y-3">
                        {tx.no_receipt_reason && (
                          <div className="rounded-lg bg-amber-500/10 p-3">
                            <p className="text-xs text-amber-500">
                              <strong>Motivo informado:</strong> {tx.no_receipt_reason}
                            </p>
                          </div>
                        )}

                        <label 
                          htmlFor={`upload-${tx.id}`}
                          className="relative block cursor-pointer rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/10 p-4"
                        >
                          {/* INPUT COM CORREÇÕES PARA iOS */}
                          <input
                            type="file"
                            // CORREÇÃO: Accept mais específico para iOS
                            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,application/pdf"
                            onChange={(e) => handleFileSelect(tx.id, e)}
                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            id={`upload-${tx.id}`}
                            disabled={uploadingId === tx.id}
                            // CORREÇÃO: Remover capture para evitar problemas no iOS
                            // capture="environment" <- REMOVER ISSO
                          />
                          <div className="flex flex-col items-center gap-2 pointer-events-none">
                            <Upload className="h-6 w-6 text-amber-500" />
                            <span className="text-sm text-amber-500 text-center">
                              {uploadingId === tx.id ? "Enviando arquivo..." : "Toque para enviar o comprovante"}
                            </span>
                            <span className="text-xs text-amber-500/60">
                              Aceita: JPG, PNG, PDF
                            </span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Link do Comprovante */}
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

                    {/* Rejeição */}
                    {tx.status === "rejected" && tx.rejection_reason && (
                      <div className="rounded-lg bg-rose-500/10 p-3">
                        <p className="text-sm text-rose-400">
                          <strong>Motivo da rejeição:</strong> {tx.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Botão de Estorno */}
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

                    {/* Motivo do Estorno */}
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
