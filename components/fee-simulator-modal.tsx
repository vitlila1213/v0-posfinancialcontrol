"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useSupabase } from "@/lib/supabase-context"
import { calculateChargeValue, calculateSaleValue, formatCurrency, formatPercentage } from "@/lib/pos-rates"
import type { CardBrand, PaymentType, PlanType, CustomPlanRate } from "@/lib/types"

interface FeeSimulatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SimulationMode = "receive" | "sale"

export function FeeSimulatorModal({ open, onOpenChange }: FeeSimulatorModalProps) {
  const { profile, supabase } = useSupabase()
  const [grossValue, setGrossValue] = useState("")
  const [brand, setBrand] = useState<CardBrand>("visa")
  const [paymentType, setPaymentType] = useState<PaymentType>("debit")
  const [installments, setInstallments] = useState(1)
  const [mode, setMode] = useState<SimulationMode>("receive")
  const [customRates, setCustomRates] = useState<CustomPlanRate[]>([])
  const [customPlanName, setCustomPlanName] = useState<string>("")
  const [isLoadingRates, setIsLoadingRates] = useState(false)

  const clientPlan = profile?.plan as PlanType | null

  useEffect(() => {
    async function fetchCustomPlanInfo() {
      if (!clientPlan) return

      // Check if it's a custom plan (UUID format)
      if (clientPlan !== "basic" && clientPlan !== "intermediario" && clientPlan !== "top") {
        setIsLoadingRates(true)
        try {
          console.log("[v0] Buscando taxas personalizadas para plano:", clientPlan)

          // Fetch custom plan info and rates from API
          const response = await fetch(`/api/custom-plans/rates?planId=${clientPlan}`)
          
          if (!response.ok) {
            throw new Error(`Erro ao buscar taxas: ${response.status}`)
          }

          const result = await response.json()
          
          if (result.success) {
            console.log("[v0] Taxas personalizadas carregadas:", result.rates?.length || 0, "taxas")
            setCustomRates(result.rates || [])
            setCustomPlanName(result.planName || "Personalizado")
          } else {
            console.error("[v0] Erro na resposta da API:", result.error)
            setCustomRates([])
            setCustomPlanName("Personalizado")
          }
        } catch (err) {
          console.error("[v0] Erro ao buscar informações do plano:", err)
          setCustomRates([])
          setCustomPlanName("Personalizado")
        } finally {
          setIsLoadingRates(false)
        }
      } else {
        setCustomRates([])
        setCustomPlanName("")
      }
    }

    if (open) {
      fetchCustomPlanInfo()
    }
  }, [open, clientPlan])

  const getBrandGroup = (cardBrand: CardBrand): "VISA_MASTER" | "ELO_AMEX" | "PIX" => {
    if (paymentType === "pix_conta" || paymentType === "pix_qrcode") {
      return "PIX"
    }
    return cardBrand === "visa" ? "VISA_MASTER" : "ELO_AMEX"
  }

  const chargeCalculation =
    grossValue && clientPlan && mode === "receive"
      ? (() => {
          const brandGroup = getBrandGroup(brand)
          console.log("[v0] Calculando taxa:", {
            valor: Number.parseFloat(grossValue),
            bandeira: brandGroup,
            tipoPagamento: paymentType,
            parcelas: installments,
            plano: clientPlan,
            temTaxasPersonalizadas: customRates.length > 0,
            totalTaxas: customRates.length,
          })
          return calculateChargeValue(
            Number.parseFloat(grossValue),
            brandGroup,
            paymentType,
            installments as any,
            clientPlan,
            customRates.length > 0 ? customRates : undefined,
          )
        })()
      : null

  // Para PIX, não precisa calcular por bandeiras de cartão
  const isPix = paymentType === "pix_conta" || paymentType === "pix_qrcode"

  const saleCalculationVisa =
    grossValue && clientPlan && mode === "sale" && !isPix
      ? calculateSaleValue(
          Number.parseFloat(grossValue),
          "VISA_MASTER",
          paymentType,
          installments as any,
          clientPlan,
          customRates.length > 0 ? customRates : undefined,
        )
      : null

  const saleCalculationElo =
    grossValue && clientPlan && mode === "sale" && !isPix
      ? calculateSaleValue(
          Number.parseFloat(grossValue),
          "ELO_AMEX",
          paymentType,
          installments as any,
          clientPlan,
          customRates.length > 0 ? customRates : undefined,
        )
      : null

  const saleCalculationPix =
    grossValue && clientPlan && mode === "sale" && isPix
      ? calculateSaleValue(
          Number.parseFloat(grossValue),
          "PIX",
          paymentType,
          installments as any,
          clientPlan,
          customRates.length > 0 ? customRates : undefined,
        )
      : null

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
                <Calculator className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Simulador de Taxas</h2>
                <p className="text-xs text-muted-foreground">
                  Plano:{" "}
                  {clientPlan
                    ? clientPlan === "basic"
                      ? "Básico"
                      : clientPlan === "intermediario"
                        ? "Intermediário"
                        : clientPlan === "top"
                          ? "Master"
                          : customPlanName || "Personalizado"
                    : "Nenhum"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!clientPlan ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-500">
                Você ainda não possui um plano atribuído. Entre em contato com o gestor.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <Label className="text-sm text-muted-foreground">Modo de Simulação</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("receive")}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      mode === "receive"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    Valor a Receber
                  </button>
                  <button
                    onClick={() => setMode("sale")}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      mode === "sale"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    Valor da Venda
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {mode === "receive"
                    ? "Calcule quanto você vai receber após as taxas"
                    : "Calcule quanto o cliente pagará com as taxas incluídas"}
                </p>
              </div>

              {/* Valor Bruto */}
              <div>
                <Label htmlFor="grossValue" className="text-sm text-muted-foreground">
                  {mode === "receive" ? "Valor que Deseja Receber (R$)" : "Valor Base do Produto (R$)"}
                </Label>
                <Input
                  id="grossValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={grossValue}
                  onChange={(e) => setGrossValue(e.target.value)}
                  placeholder="0,00"
                  className="mt-2 border-white/10 bg-white/5"
                />
              </div>

              {/* Bandeira do Cartão */}
              <div>
                <Label className="text-sm text-muted-foreground">Bandeira do Cartão</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBrand("visa")}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      brand === "visa"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    Visa / Mastercard
                  </button>
                  <button
                    onClick={() => setBrand("elo")}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      brand === "elo"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    Elo / Amex
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Cada bandeira tem taxas diferentes</p>
              </div>

              {/* Tipo de Pagamento */}
              <div>
                <Label className="text-sm text-muted-foreground">Tipo de Pagamento</Label>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={() => {
                      setPaymentType("debit")
                      setInstallments(1)
                    }}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      paymentType === "debit"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    Débito
                  </button>
                  <button
                    onClick={() => setPaymentType("credit")}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      paymentType === "credit"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    Crédito
                  </button>
                  <button
                    onClick={() => {
                      setPaymentType("pix_conta")
                      setInstallments(1)
                    }}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      paymentType === "pix_conta"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    PIX Conta
                  </button>
                  <button
                    onClick={() => {
                      setPaymentType("pix_qrcode")
                      setInstallments(1)
                    }}
                    className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                      paymentType === "pix_qrcode"
                        ? "border-violet-500 bg-violet-500/20 text-violet-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    PIX QR Code
                  </button>
                </div>
              </div>

              {/* Parcelas (se crédito) */}
              {paymentType === "credit" && (
                <div>
                  <Label className="text-sm text-muted-foreground">Número de Parcelas</Label>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => setInstallments(num)}
                        className={`rounded-lg border py-2 px-1 text-sm font-medium transition-all ${
                          installments === num
                            ? "border-violet-500 bg-violet-500/20 text-violet-500 ring-1 ring-violet-500"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "receive" && chargeCalculation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-semibold text-violet-400">
                      {brand === "visa" ? "Visa / Mastercard" : "Elo / Amex"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Taxa: {formatPercentage(chargeCalculation.feePercentage)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor que Deseja Receber</span>
                    <span className="font-semibold text-emerald-400">
                      {formatCurrency(chargeCalculation.desiredNetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa Aplicada</span>
                    <span className="font-semibold text-violet-400">
                      {formatPercentage(chargeCalculation.feePercentage)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor da Taxa</span>
                    <span className="font-semibold text-amber-400">+{formatCurrency(chargeCalculation.feeAmount)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Valor a Cobrar do Cliente</span>
                    <span className="text-xl font-bold text-blue-400">
                      {formatCurrency(chargeCalculation.chargeAmount)}
                    </span>
                  </div>
                  {paymentType === "credit" && installments > 1 && (
                    <>
                      <div className="h-px bg-white/10" />
                      <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Cliente pagará</span>
                          <span className="text-lg font-bold text-blue-400">
                            {installments}x de {formatCurrency(chargeCalculation.chargeAmount / installments)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-emerald-400 font-medium">
                          ✓ Você receberá {formatCurrency(chargeCalculation.desiredNetAmount)} líquido ({installments}x
                          de {formatCurrency(chargeCalculation.desiredNetAmount / installments)})
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* Resultado para PIX */}
              {mode === "sale" && saleCalculationPix && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-semibold text-emerald-400">PIX</span>
                      <span className="text-xs text-muted-foreground">
                        Taxa: {formatPercentage(saleCalculationPix.feePercentage)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor do Produto</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(saleCalculationPix.baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total com Taxas</span>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(saleCalculationPix.totalAmount)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Resultado para Cartões */}
              {mode === "sale" && saleCalculationVisa && saleCalculationElo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Visa / Mastercard */}
                  <div className="space-y-3 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-semibold text-blue-400">Visa / Mastercard</span>
                      <span className="text-xs text-muted-foreground">
                        Taxa: {formatPercentage(saleCalculationVisa.feePercentage)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor do Produto</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(saleCalculationVisa.baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total com Taxas</span>
                      <span className="font-semibold text-blue-400">
                        {formatCurrency(saleCalculationVisa.totalAmount)}
                      </span>
                    </div>
                    {saleCalculationVisa.installments > 1 && (
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">Valor de Cada Parcela</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {saleCalculationVisa.installments}x de {formatCurrency(saleCalculationVisa.installmentValue)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Elo / Amex */}
                  <div className="space-y-3 rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-semibold text-orange-400">Elo / Amex</span>
                      <span className="text-xs text-muted-foreground">
                        Taxa: {formatPercentage(saleCalculationElo.feePercentage)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor do Produto</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(saleCalculationElo.baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total com Taxas</span>
                      <span className="font-semibold text-orange-400">
                        {formatCurrency(saleCalculationElo.totalAmount)}
                      </span>
                    </div>
                    {saleCalculationElo.installments > 1 && (
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">Valor de Cada Parcela</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {saleCalculationElo.installments}x de {formatCurrency(saleCalculationElo.installmentValue)}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"
              >
                Fechar Simulador
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
