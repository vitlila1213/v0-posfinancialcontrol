"use client"

import React from "react"

import { useState, useCallback, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CreditCard, Check, ArrowRight, FileUp, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import { resizeImage } from "@/lib/image-utils"
import {
  PLAN_RATES,
  PLAN_NAMES,
  type BrandGroup,
  type PaymentType,
  type Installments,
  calculateFee,
} from "@/lib/pos-rates"
import { useSupabase } from "@/lib/supabase-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDropzone } from "react-dropzone"
import { VoiceAssistantButton } from "@/components/voice-assistant-button"
import { ReceiptReaderButton } from "@/components/receipt-reader-button"
import { Textarea } from "@/components/ui/textarea"
import type { VoiceCommand, ReceiptData } from "@/app/actions/voice-assistant"
import { createClient } from "@/lib/supabase/client"
import type { CustomPlanRate } from "@/lib/types"

interface AddTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTransactionModal({ open, onOpenChange }: AddTransactionModalProps) {
  const { addTransaction, profile } = useSupabase()
  const [step, setStep] = useState(1)
  const [grossAmount, setGrossAmount] = useState("")
  const [brand, setBrand] = useState<BrandGroup>("VISA_MASTER")
  const [paymentType, setPaymentType] = useState<PaymentType>("credit")
  const [installments, setInstallments] = useState<Installments>(1)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [noReceiptReason, setNoReceiptReason] = useState("")
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false) // Added dragging state
  const fileInputRef = React.createRef<HTMLInputElement>()
  const [customRates, setCustomRates] = useState<CustomPlanRate[]>([])
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  const handleReceiptDataExtracted = useCallback((data: ReceiptData) => {
    console.log("[v0] Dados do comprovante recebidos:", data)

    // Preencher o valor
    setGrossAmount(data.amount.toString())

    // Mapear payment_type para PaymentType e BrandGroup
    if (data.payment_type === "credito") {
      setPaymentType("credit")
      setBrand("VISA_MASTER") // Padrão para crédito
    } else if (data.payment_type === "debito") {
      setPaymentType("debit")
      setBrand("VISA_MASTER") // Padrão para débito
    } else if (data.payment_type === "pix_qr") {
      setPaymentType("pix_qrcode")
      setBrand("PIX")
    } else if (data.payment_type === "pix_conta") {
      setPaymentType("pix_conta")
      setBrand("PIX")
    }

    // Definir parcelas
    setInstallments(data.installments as Installments)

    // Avançar para Step 2 após um pequeno delay
    setTimeout(() => {
      setStep(2)
    }, 800)
  }, [])

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDragging(false)
    const file = acceptedFiles[0]
    if (!file) return

    alert("Imagem detectada!")
    console.log("[v0] File dropped:", file.name, file.size)

    setIsProcessingImage(true)

    try {
      console.log("[v0] Redimensionando...")
      const resizedFile = await resizeImage(file)
      console.log("[v0] Redimensionado:", resizedFile.size)

      setReceiptFile(resizedFile)
      toast.success("Comprovante adicionado!")
    } catch (error: any) {
      console.error("[v0] Erro:", error)
      alert("Erro ao processar: " + error.message)
      toast.error(`Erro: ${error.message}`)
    } finally {
      setIsProcessingImage(false)
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    alert("Imagem detectada!")
    console.log("[v0] File selected:", file.name, file.size)

    setIsProcessingImage(true)

    try {
      console.log("[v0] Redimensionando...")
      const resizedFile = await resizeImage(file)
      console.log("[v0] Redimensionado:", resizedFile.size)

      setReceiptFile(resizedFile)
      toast.success("Comprovante adicionado!")
    } catch (error: any) {
      console.error("[v0] Erro:", error)
      alert("Erro ao processar: " + error.message)
      toast.error(`Erro: ${error.message}`)
    } finally {
      setIsProcessingImage(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".heic", ".heif"],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const clientPlan = profile?.plan
  const numericAmount = Number.parseFloat(grossAmount) || 0
  const calculation = useMemo(() => {
    if (!grossAmount || !clientPlan) return null
    const amount = Number.parseFloat(grossAmount)
    if (isNaN(amount)) return null

    console.log("[v0] Calculating fee with:", { amount, brand, paymentType, installments, clientPlan })
    const result = calculateFee(
      amount,
      brand,
      paymentType,
      installments,
      clientPlan,
      customRates.length > 0 ? customRates : undefined,
    )
    console.log("[v0] Calculation result:", result)
    return result
  }, [grossAmount, brand, paymentType, installments, clientPlan, customRates])

  const planRates = clientPlan ? PLAN_RATES[clientPlan] : null

  const handleSubmit = async () => {
    if (!numericAmount || numericAmount <= 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      console.log("[v0] Calculating fee with:", {
        amount: numericAmount,
        brand: brand,
        paymentType,
        installments,
        clientPlan,
      })

      const feeCalculation = calculateFee(
        numericAmount,
        brand,
        paymentType === "pix_qrcode" ? "pix_qrcode" : paymentType === "pix_conta" ? "pix_conta" : paymentType,
        installments,
        clientPlan,
        customRates.length > 0 ? customRates : undefined,
      )

      console.log("[v0] Fee calculation result:", feeCalculation)

      await addTransaction({
        grossValue: feeCalculation.grossAmount,
        brand: brand === "PIX" ? "pix" : brand === "VISA_MASTER" ? "visa_master" : "elo_amex",
        paymentType:
          paymentType === "pix_qrcode" ? "pix_qrcode" : paymentType === "pix_conta" ? "pix_conta" : paymentType,
        installments,
        receiptUrl: receiptFile ? URL.createObjectURL(receiptFile) : undefined,
        noReceiptReason: !receiptFile && noReceiptReason ? noReceiptReason : undefined,
      })

      handleClose()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("[v0] Erro ao adicionar transação:", err)
      setError(err instanceof Error ? err.message : "Erro ao adicionar transação")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setGrossAmount("")
    setBrand("VISA_MASTER")
    setPaymentType("credit")
    setInstallments(1)
    setReceiptFile(null)
    setError(null)
    setNoReceiptReason("")
    setCustomRates([])
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleVoiceCommand = useCallback(
    (command: VoiceCommand) => {
      console.log("[v0] Comando recebido:", command)

      if (command.intent === "update_data" && command.data) {
        if (command.data.amount) {
          setGrossAmount(command.data.amount.toString())
        }

        if (command.data.card_brand) {
          setBrand(command.data.card_brand)

          // Se mudou para PIX, ajusta payment_type
          if (command.data.card_brand === "PIX" && !paymentType.startsWith("pix")) {
            setPaymentType("pix_qrcode")
            setInstallments(1)
          }
          // Se mudou de PIX para cartão, ajusta para crédito
          else if (command.data.card_brand !== "PIX" && paymentType.startsWith("pix")) {
            setPaymentType("credit")
          }
        }

        if (command.data.payment_type) {
          // Mapear payment_type para PaymentType do formulário
          if (command.data.payment_type === "credito") {
            setPaymentType("credit")
            // Se não especificou bandeira, assume VISA_MASTER
            if (brand === "PIX") {
              setBrand("VISA_MASTER")
            }
          } else if (command.data.payment_type === "debito") {
            setPaymentType("debit")
            if (brand === "PIX") {
              setBrand("VISA_MASTER")
            }
          } else if (command.data.payment_type === "pix_qr") {
            setPaymentType("pix_qrcode")
            setBrand("PIX")
          } else if (command.data.payment_type === "pix_conta") {
            setPaymentType("pix_conta")
            setBrand("PIX")
          }
        }

        if (command.data.installments) {
          setInstallments(command.data.installments as Installments)
          // Se tem parcelas > 1, garante que é crédito
          if (command.data.installments > 1) {
            setPaymentType("credit")
          }
        }
      } else if (command.intent === "next_step") {
        // Avança para próxima etapa
        if (step < 3 && numericAmount > 0) {
          setStep(step + 1)
        }
      } else if (command.intent === "submit") {
        // Finaliza e envia o formulário
        if (step === 3) {
          handleSubmit()
        }
      }
    },
    [step, numericAmount, brand, paymentType],
  )

  useEffect(() => {
    async function fetchCustomRates() {
      if (!clientPlan || !open) return

      // Check if it's a custom plan (UUID format)
      if (clientPlan !== "basic" && clientPlan !== "intermediario" && clientPlan !== "top") {
        setIsLoadingRates(true)
        try {
          const supabase = createClient()
          const { data, error } = await supabase.from("custom_plan_rates").select("*").eq("plan_id", clientPlan)

          if (error) {
            console.error("[v0] Erro ao buscar taxas personalizadas:", error)
            setCustomRates([])
          } else {
            console.log("[v0] Taxas personalizadas carregadas para transação:", data)
            setCustomRates(data || [])
          }
        } catch (err) {
          console.error("[v0] Erro ao buscar taxas:", err)
          setCustomRates([])
        } finally {
          setIsLoadingRates(false)
        }
      } else {
        setCustomRates([])
      }
    }

    fetchCustomRates()
  }, [open, clientPlan])

  const getBrandGroup = (): BrandGroup => {
    return brand === "PIX" ? "PIX" : brand === "VISA_MASTER" ? "VISA_MASTER" : "ELO_AMEX"
  }

  const uploadReceipt = async (): Promise<string> => {
    // Placeholder for receipt upload logic
    return ""
  }

  if (!clientPlan) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl pointer-events-auto"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Plano Não Atribuído</h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-500">
                    Você ainda não possui um plano atribuído. Entre em contato com o gestor para que ele configure seu
                    plano de taxas antes de registrar transações.
                  </p>
                </div>

                <Button onClick={handleClose} className="mt-6 w-full bg-amber-500 text-white hover:bg-amber-600">
                  Entendi
                </Button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose()
              }
            }}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl pointer-events-auto sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 sm:h-10 sm:w-10">
                    <CreditCard className="h-4 w-4 text-emerald-500 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground sm:text-lg">Nova Transação</h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Plano {PLAN_NAMES[clientPlan]} • Etapa {step} de 3
                    </p>
                    {isRecording && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-rose-500"
                      >
                        Ouvindo...
                      </motion.p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ReceiptReaderButton onDataExtracted={handleReceiptDataExtracted} disabled={step !== 1} />
                  <VoiceAssistantButton onCommand={handleVoiceCommand} onRecordingChange={setIsRecording} />
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground sm:p-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                  <p className="text-sm text-rose-500">{error}</p>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-4 flex gap-2 sm:mb-6">
                {[1, 2, 3].map((s) => (
                  <motion.div
                    key={s}
                    className={cn("h-1 flex-1 rounded-full", s <= step ? "bg-emerald-500" : "bg-white/10")}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: s * 0.1 }}
                  />
                ))}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Valor Bruto (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={grossAmount}
                        onChange={(e) => setGrossAmount(e.target.value)}
                        className="mt-1 h-10 border-white/10 bg-white/5 text-base font-semibold sm:mt-1.5 sm:h-12 sm:text-lg"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Bandeira do Cartão</Label>
                      <div className="mt-1 grid grid-cols-2 gap-2 sm:mt-1.5 sm:grid-cols-3">
                        {(["VISA_MASTER", "ELO_AMEX", "PIX"] as BrandGroup[]).map((b) => (
                          <button
                            key={b}
                            onClick={() => {
                              setBrand(b)
                              if (b === "PIX") {
                                setPaymentType("pix_qrcode")
                                setInstallments(1)
                              } else if (paymentType.startsWith("pix")) {
                                setPaymentType("credit")
                              }
                            }}
                            className={cn(
                              "rounded-lg border p-2.5 text-xs font-medium transition-all sm:p-3 sm:text-sm",
                              brand === b
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            {planRates?.[b].name || b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Tipo de Pagamento</Label>
                      {brand === "PIX" ? (
                        <div className="mt-1 grid grid-cols-2 gap-2 sm:mt-1.5">
                          <button
                            onClick={() => {
                              setPaymentType("pix_conta")
                              setInstallments(1)
                            }}
                            className={cn(
                              "rounded-lg border p-2.5 text-xs font-medium transition-all sm:p-3 sm:text-sm",
                              paymentType === "pix_conta"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            PIX Conta
                          </button>
                          <button
                            onClick={() => {
                              setPaymentType("pix_qrcode")
                              setInstallments(1)
                            }}
                            className={cn(
                              "rounded-lg border p-2.5 text-xs font-medium transition-all sm:p-3 sm:text-sm",
                              paymentType === "pix_qrcode"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            PIX QR Code
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 grid grid-cols-2 gap-2 sm:mt-1.5">
                          <button
                            onClick={() => {
                              setPaymentType("debit")
                              setInstallments(1)
                            }}
                            className={cn(
                              "rounded-lg border p-2.5 text-xs font-medium transition-all sm:p-3 sm:text-sm",
                              paymentType === "debit"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            Débito
                          </button>
                          <button
                            onClick={() => setPaymentType("credit")}
                            className={cn(
                              "rounded-lg border p-2.5 text-xs font-medium transition-all sm:p-3 sm:text-sm",
                              paymentType === "credit"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            Crédito
                          </button>
                        </div>
                      )}
                    </div>

                    {paymentType === "credit" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Label className="text-xs text-muted-foreground sm:text-sm">Parcelas</Label>
                        <div className="mt-1 grid grid-cols-6 gap-1 sm:mt-1.5 sm:gap-1.5">
                          {Array.from({ length: 18 }, (_, i) => (i + 1) as Installments).map((inst) => (
                            <button
                              key={inst}
                              onClick={() => setInstallments(inst)}
                              className={cn(
                                "rounded-lg border p-1.5 text-xs font-medium transition-all sm:p-2",
                                installments === inst
                                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                              )}
                            >
                              {inst}x
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {calculation &&
                      calculation.grossAmount !== undefined &&
                      calculation.fee !== undefined &&
                      calculation.netAmount !== undefined && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Valor Bruto:</span>
                              <span className="font-semibold text-foreground">
                                R$ {calculation.grossAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Taxa ({calculation.rate}%):</span>
                              <span className="font-semibold text-rose-500">- R$ {calculation.fee.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex justify-between">
                              <span className="font-semibold text-emerald-500">Valor Líquido:</span>
                              <span className="text-lg font-bold text-emerald-500">
                                R$ {calculation.netAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Upload do Comprovante (Opcional)</Label>
                      <div
                        {...getRootProps()}
                        className={cn(
                          "mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all sm:p-8",
                          isDragActive ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/5",
                          "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5",
                          isProcessingImage && "opacity-50 pointer-events-none",
                        )}
                      >
                        <input {...getInputProps({ accept: "image/*,application/pdf,.heic" })} />
                        {isProcessingImage ? (
                          <div className="text-center">
                            <Loader2 className="mb-2 h-8 w-8 animate-spin text-emerald-500" />
                            <p className="text-sm text-emerald-500">Processando imagem...</p>
                          </div>
                        ) : receiptFile ? (
                          <div className="text-center">
                            <p className="text-sm font-medium text-emerald-500">{receiptFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(receiptFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Arraste um arquivo ou clique para selecionar
                            </p>
                            <p className="text-sm text-muted-foreground">PDF, PNG, JPG ou HEIC (máx. 10MB)</p>
                            <p className="text-xs text-violet-400 mt-1">✨ Compressão automática para iPhone</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {!receiptFile && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Motivo (opcional)</Label>
                        <Textarea
                          value={noReceiptReason}
                          onChange={(e) => setNoReceiptReason(e.target.value)}
                          placeholder="Ex: Venda presencial sem impressora, cliente não solicitou comprovante, etc."
                          className="h-20 resize-none border-white/10 bg-white/5 text-sm"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    {calculation && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Valor Bruto:</span>
                            <span className="font-semibold text-foreground">
                              R$ {calculation.grossAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Taxa ({calculation.feePercentage.toFixed(2)}%):
                            </span>
                            <span className="font-semibold text-rose-500">- R$ {calculation.feeAmount.toFixed(2)}</span>
                          </div>
                          <div className="h-px bg-white/10" />
                          <div className="flex justify-between">
                            <span className="font-semibold text-emerald-500">Valor Líquido:</span>
                            <span className="text-lg font-bold text-emerald-500">
                              R$ {calculation.netAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {brand === "VISA_MASTER" ? "Visa/Master" : brand === "ELO_AMEX" ? "Elo/Amex" : "PIX"} •{" "}
                            {paymentType === "debit"
                              ? "Débito"
                              : paymentType === "credit"
                                ? `Crédito ${installments}x`
                                : paymentType === "pix_conta"
                                  ? "PIX Conta"
                                  : "PIX QR Code"}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Enviar Comprovante</Label>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1">
                        Envie agora para agilizar a verificação
                      </p>

                      <div
                        {...getRootProps()}
                        className={cn(
                          "mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all sm:mt-3 sm:min-h-[160px]",
                          isDragActive
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20",
                          receiptFile && "border-emerald-500 bg-emerald-500/10",
                          isProcessingImage && "opacity-50 pointer-events-none",
                        )}
                      >
                        <input {...getInputProps({ accept: "image/*,application/pdf,.heic" })} />
                        {receiptFile ? (
                          <div className="flex flex-col items-center gap-1.5 text-emerald-500 sm:gap-2">
                            <Check className="h-6 w-6 sm:h-8 sm:w-8" />
                            <span className="text-xs font-medium sm:text-sm">{receiptFile.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setReceiptFile(null)
                                setNoReceiptReason("")
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground sm:gap-2">
                            <FileUp className="h-6 w-6 sm:h-8 sm:w-8" />
                            <span className="text-xs sm:text-sm">
                              {isDragActive ? "Solte o arquivo" : "Arraste, tire foto ou selecione"}
                            </span>
                            <span className="text-xs">PDF, PNG, JPG ou HEIC</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4">
                      <p className="text-xs text-amber-500 sm:text-sm">
                        {receiptFile
                          ? "Comprovante anexado. Saldo liberado após verificação."
                          : "Transação será enviada para análise manual do gestor."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Actions */}
              <div className="mt-4 flex gap-2 sm:mt-6">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 border-white/10 bg-white/5 text-xs sm:text-sm"
                  >
                    Voltar
                  </Button>
                )}

                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !numericAmount}
                    className="flex-1 bg-emerald-500 text-xs text-white hover:bg-emerald-600 sm:text-sm"
                  >
                    Continuar
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-500 text-xs text-white hover:bg-emerald-600 sm:text-sm"
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    {isSubmitting ? "Adicionando..." : "Adicionar"}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
