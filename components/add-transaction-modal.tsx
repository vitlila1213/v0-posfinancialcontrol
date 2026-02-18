"use client"

import React from "react"

import { useState, useCallback, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CreditCard, Check, ArrowRight, FileUp, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "react-toastify"

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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = React.createRef<HTMLInputElement>()
  const [customRates, setCustomRates] = useState<CustomPlanRate[]>([])
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false) // Declare the variable here
  const [customPlanName, setCustomPlanName] = useState<string>("")

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

    console.log("[v0] File dropped:", file.name, file.size)

    // Verificar tamanho do arquivo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.")
      return
    }

    setReceiptFile(file)
    toast.success("Comprovante adicionado!")
  }, [])



  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const clientPlan = profile?.plan
  const numericAmount = Number.parseFloat(grossAmount) || 0
  const isCustomPlan = clientPlan && clientPlan !== "basic" && clientPlan !== "intermediario" && clientPlan !== "top"
  
  const calculation = useMemo(() => {
    if (!grossAmount || !clientPlan) {
      console.log("[v0] Calculation skipped: missing grossAmount or clientPlan")
      return null
    }
    
    // Se é plano personalizado e ainda está carregando as taxas, retornar null
    if (isCustomPlan && isLoadingRates) {
      console.log("[v0] Calculation skipped: loading custom rates")
      return null
    }
    
    // Se é plano personalizado e não tem taxas carregadas, retornar null
    if (isCustomPlan && customRates.length === 0) {
      console.log("[v0] Calculation skipped: no custom rates loaded for custom plan")
      return null
    }
    
    const amount = Number.parseFloat(grossAmount)
    if (isNaN(amount) || amount <= 0) {
      console.log("[v0] Calculation skipped: invalid amount")
      return null
    }

    try {
      console.log("[v0] Calculating fee with:", { 
        amount, 
        brand, 
        paymentType, 
        installments, 
        clientPlan,
        isCustomPlan,
        customRatesCount: customRates.length 
      })
      
      // Validação de paymentType para PIX
      let finalPaymentType: "debit" | "credit" | "pix_qrcode" | "pix_conta"
      if (brand === "PIX") {
        finalPaymentType = paymentType === "pix_qrcode" ? "pix_qrcode" : "pix_conta"
      } else {
        finalPaymentType = paymentType === "debit" ? "debit" : "credit"
      }
      
      const result = calculateFee(
        amount,
        brand,
        finalPaymentType,
        installments,
        clientPlan,
        isCustomPlan ? customRates : undefined,
      )
      console.log("[v0] Calculation result:", result)
      
      // Validar resultado
      if (!result || result.grossAmount === undefined || result.netAmount === undefined) {
        console.error("[v0] Invalid calculation result:", result)
        return null
      }
      
      return result
    } catch (err) {
      console.error("[v0] Error calculating fee:", err)
      return null
    }
  }, [grossAmount, brand, paymentType, installments, clientPlan, customRates, isCustomPlan, isLoadingRates])

  const planRates = clientPlan && (clientPlan === "basic" || clientPlan === "intermediario" || clientPlan === "top") 
    ? PLAN_RATES[clientPlan] 
    : null

  const handleSubmit = async () => {
    if (!numericAmount || numericAmount <= 0) {
      setError("Por favor, insira um valor válido")
      return
    }

    if (!clientPlan) {
      setError("Plano não atribuído. Entre em contato com o gestor.")
      return
    }

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

      // Validação de paymentType para PIX
      let finalPaymentType: "debit" | "credit" | "pix_qrcode" | "pix_conta"
      if (brand === "PIX") {
        finalPaymentType = paymentType === "pix_qrcode" ? "pix_qrcode" : "pix_conta"
      } else {
        finalPaymentType = paymentType === "debit" ? "debit" : "credit"
      }

      const feeCalculation = calculateFee(
        numericAmount,
        brand,
        finalPaymentType,
        installments,
        clientPlan,
        customRates.length > 0 ? customRates : undefined,
      )

      console.log("[v0] Fee calculation result:", feeCalculation)

      // Validação dos resultados do cálculo
      if (!feeCalculation || feeCalculation.grossAmount === undefined || feeCalculation.netAmount === undefined) {
        throw new Error("Erro ao calcular taxas. Verifique os dados inseridos.")
      }

      await addTransaction({
        grossValue: feeCalculation.grossAmount,
        brand: brand === "PIX" ? "pix" : brand === "VISA_MASTER" ? "visa_master" : "elo_amex",
        paymentType: finalPaymentType,
        installments,
        receiptFile: receiptFile || undefined,
        noReceiptReason: !receiptFile && noReceiptReason ? noReceiptReason : undefined,
      })

      toast.success("Transação adicionada com sucesso!")
      handleClose()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("[v0] Erro ao adicionar transação:", err)
      const errorMessage = err instanceof Error ? err.message : "Erro ao adicionar transação"
      setError(errorMessage)
      toast.error(errorMessage)
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
    setIsProcessingImage(false) // Reset the variable here
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

      console.log("[v0] Cliente plan detectado:", clientPlan)

      // Check if it's a custom plan (UUID format)
      if (clientPlan !== "basic" && clientPlan !== "intermediario" && clientPlan !== "top") {
        console.log("[v0] É um plano personalizado, buscando taxas...")
        setIsLoadingRates(true)
        try {
          const supabase = createClient()
          
          // Fetch custom plan name
          const { data: planData, error: planError } = await supabase
            .from("custom_plans")
            .select("name")
            .eq("id", clientPlan)
            .single()

          if (planError) {
            console.error("[v0] Erro ao buscar nome do plano:", planError)
          } else if (planData) {
            console.log("[v0] Nome do plano personalizado:", planData.name)
            setCustomPlanName(planData.name)
          }

          // Fetch custom rates
          const { data, error } = await supabase.from("custom_plan_rates").select("*").eq("plan_id", clientPlan)

          if (error) {
            console.error("[v0] Erro ao buscar taxas personalizadas:", error)
            setCustomRates([])
          } else {
            console.log("[v0] Taxas personalizadas carregadas para transação:", data)
            console.log("[v0] Número de taxas encontradas:", data?.length || 0)
            setCustomRates(data || [])
          }
        } catch (err) {
          console.error("[v0] Erro ao buscar taxas:", err)
          setCustomRates([])
        } finally {
          setIsLoadingRates(false)
        }
      } else {
        console.log("[v0] É um plano padrão:", clientPlan)
        setCustomRates([])
        setCustomPlanName("")
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
                      Plano {clientPlan === "basic" || clientPlan === "intermediario" || clientPlan === "top" 
                        ? PLAN_NAMES[clientPlan] 
                        : customPlanName || "Personalizado"} • Etapa {step} de 3
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
                    {isCustomPlan && isLoadingRates && (
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                        <div className="flex items-center gap-2 text-xs text-blue-400 sm:text-sm">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                          <span>Carregando taxas do plano {customPlanName}...</span>
                        </div>
                      </div>
                    )}
                    
                    {isCustomPlan && !isLoadingRates && customRates.length === 0 && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs text-rose-400 sm:text-sm">
                            Não foi possível carregar as taxas do plano {customPlanName || "personalizado"}. As taxas estão salvas no banco, mas houve um erro ao carregá-las.
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log("[v0] Tentando recarregar taxas...")
                              setIsLoadingRates(true)
                              // Força um reload fechando e reabrindo o modal ou recarregando a página
                              window.location.reload()
                            }}
                            className="shrink-0 border-rose-400/30 text-rose-400 hover:bg-rose-500/20"
                          >
                            Recarregar
                          </Button>
                        </div>
                      </div>
                    )}
                    
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
                            {b === "VISA_MASTER" ? "Visa / Master" : b === "ELO_AMEX" ? "Elo / Amex" : "PIX"}
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
                    {isLoadingRates && isCustomPlan && (
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                        <div className="flex items-center gap-2 text-sm text-blue-400">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                          <span>Carregando taxas do plano personalizado...</span>
                        </div>
                      </div>
                    )}
                    
                    {!isLoadingRates && isCustomPlan && customRates.length === 0 && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                        <div className="text-sm text-rose-400">
                          Não foi possível carregar as taxas do plano personalizado. Por favor, tente novamente.
                        </div>
                      </div>
                    )}
                    
                    {calculation &&
                      calculation.grossAmount !== undefined &&
                      calculation.feeAmount !== undefined &&
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
                              <span className="text-muted-foreground">Taxa ({calculation.feePercentage.toFixed(2)}%):</span>
                              <span className="font-semibold text-rose-500">- R$ {calculation.feeAmount.toFixed(2)}</span>
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
                        )}
                      >
                        <input {...getInputProps({ accept: "image/*,application/pdf" })} />
                        {receiptFile ? (
                          <div className="text-center">
                            <p className="text-sm font-medium text-emerald-500">{receiptFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(receiptFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Arraste um arquivo ou clique para selecionar
                            </p>
                            <p className="text-sm text-muted-foreground">PDF, PNG, JPG (máx. 5MB)</p>
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
                            {brand === "VISA_MASTER" ? "Visa/Master" : brand === "ELO_AMEX" ? "Elo/Amex" : brand === "PIX" ? "PIX" : brand} •{" "}
                            {paymentType === "debit"
                              ? "Débito"
                              : paymentType === "credit"
                                ? `Crédito ${installments}x`
                                : paymentType === "pix_conta"
                                  ? "PIX Conta"
                                  : paymentType === "pix_qrcode"
                                    ? "PIX QR Code"
                                    : paymentType}
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
                      disabled={
                        (step === 1 && !numericAmount) ||
                        (step === 1 && isCustomPlan && (isLoadingRates || customRates.length === 0))
                      }
                      className="flex-1 bg-emerald-500 text-xs text-white hover:bg-emerald-600 sm:text-sm"
                    >
                      {step === 1 && isCustomPlan && isLoadingRates ? "Carregando..." : "Continuar"}
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
