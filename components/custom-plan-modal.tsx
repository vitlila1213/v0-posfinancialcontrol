"use client"

import { useState, useEffect } from "react"
import { X, Crown, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { useSupabase } from "@/lib/supabase-context"
import { createClient } from "@/lib/supabase/client"
import type { CustomPlan } from "@/lib/types"

interface CustomPlanModalProps {
  editingPlan?: CustomPlan | null
  onClose: () => void
  onSuccess: () => void
}

export function CustomPlanModal({ editingPlan, onClose, onSuccess }: CustomPlanModalProps) {
  const { createCustomPlan, updateCustomPlan } = useSupabase()
  const [isCreating, setIsCreating] = useState(false)
  const [planName, setPlanName] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Taxas PIX (independentes)
  const [pixConta, setPixConta] = useState("0.50")
  const [pixQr, setPixQr] = useState("1.00")

  // Taxas Visa/Master
  const [vmDebit, setVmDebit] = useState("1.99")
  const [vmCredit1x, setVmCredit1x] = useState("3.99")
  const [vmInstallments, setVmInstallments] = useState<Record<number, string>>({
    2: "4.83",
    3: "5.48",
    4: "6.12",
    5: "6.76",
    6: "7.39",
    7: "8.21",
    8: "8.83",
    9: "9.44",
    10: "10.05",
    11: "10.65",
    12: "11.25",
    13: "12.64",
    14: "13.23",
    15: "13.81",
    16: "14.39",
    17: "14.96",
    18: "15.53",
  })

  // Taxas Elo/Amex
  const [eaDebit, setEaDebit] = useState("3.10")
  const [eaCredit1x, setEaCredit1x] = useState("5.19")
  const [eaInstallments, setEaInstallments] = useState<Record<number, string>>({
    2: "6.37",
    3: "7.02",
    4: "7.66",
    5: "8.30",
    6: "8.93",
    7: "10.34",
    8: "10.96",
    9: "11.57",
    10: "12.18",
    11: "12.78",
    12: "13.38",
    13: "13.97",
    14: "14.56",
    15: "15.14",
    16: "15.72",
    17: "16.29",
    18: "16.86",
  })

  useEffect(() => {
    async function loadPlanData() {
      if (!editingPlan) return

      setPlanName(editingPlan.name)

      // Fetch rates for this plan
      const supabase = createClient()
      const { data: rates } = await supabase.from("custom_plan_rates").select("*").eq("plan_id", editingPlan.id)

      if (!rates) return

      // Populate rates by brand_group
      rates.forEach((rate) => {
        if (rate.brand_group === "PIX") {
          // PIX é independente
          if (rate.payment_type === "pix_conta") {
            setPixConta(rate.rate.toString())
          } else if (rate.payment_type === "pix_qrcode") {
            setPixQr(rate.rate.toString())
          }
        } else if (rate.brand_group === "VISA_MASTER") {
          if (rate.payment_type === "debit") {
            setVmDebit(rate.rate.toString())
          } else if (rate.payment_type === "credit" && rate.installments === 1) {
            setVmCredit1x(rate.rate.toString())
          } else if (rate.payment_type === "credit" && rate.installments) {
            setVmInstallments((prev) => ({ ...prev, [rate.installments!]: rate.rate.toString() }))
          }
        } else if (rate.brand_group === "ELO_AMEX") {
          if (rate.payment_type === "debit") {
            setEaDebit(rate.rate.toString())
          } else if (rate.payment_type === "credit" && rate.installments === 1) {
            setEaCredit1x(rate.rate.toString())
          } else if (rate.payment_type === "credit" && rate.installments) {
            setEaInstallments((prev) => ({ ...prev, [rate.installments!]: rate.rate.toString() }))
          }
        }
      })
    }

    loadPlanData()
  }, [editingPlan])

  const handleCreate = async () => {
    if (!planName.trim()) {
      setError("Digite um nome para o plano")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const ratesData = [
        // PIX (independente de bandeira)
        { brand_group: "PIX", payment_type: "pix_conta", installments: null, rate: Number.parseFloat(pixConta) },
        { brand_group: "PIX", payment_type: "pix_qrcode", installments: null, rate: Number.parseFloat(pixQr) },
        
        // Visa/Master (apenas cartão)
        { brand_group: "VISA_MASTER", payment_type: "debit", installments: null, rate: Number.parseFloat(vmDebit) },
        { brand_group: "VISA_MASTER", payment_type: "credit", installments: 1, rate: Number.parseFloat(vmCredit1x) },
        ...Object.entries(vmInstallments).map(([inst, rate]) => ({
          brand_group: "VISA_MASTER" as const,
          payment_type: "credit" as const,
          installments: Number.parseInt(inst),
          rate: Number.parseFloat(rate),
        })),
        
        // Elo/Amex (apenas cartão)
        { brand_group: "ELO_AMEX", payment_type: "debit", installments: null, rate: Number.parseFloat(eaDebit) },
        { brand_group: "ELO_AMEX", payment_type: "credit", installments: 1, rate: Number.parseFloat(eaCredit1x) },
        ...Object.entries(eaInstallments).map(([inst, rate]) => ({
          brand_group: "ELO_AMEX" as const,
          payment_type: "credit" as const,
          installments: Number.parseInt(inst),
          rate: Number.parseFloat(rate),
        })),
      ]

      if (editingPlan) {
        // Update existing plan
        await updateCustomPlan(editingPlan.id, {
          name: planName,
          rates: ratesData,
        })
      } else {
        // Create new plan
        await createCustomPlan({
          name: planName,
          rates: ratesData,
        })
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar plano")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
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
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
                <Crown className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingPlan ? "Editar" : "Criar"} Plano Personalizado
                </h2>
                <p className="text-sm text-muted-foreground">Configure as taxas personalizadas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Nome do Plano */}
            <div>
              <Label htmlFor="planName">Nome do Plano</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ex: Plano Premium"
                className="mt-1"
              />
            </div>

            {/* PIX - Independente */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">PIX</h3>
              <p className="mb-4 text-xs text-muted-foreground">PIX não é transação de cartão, portanto tem taxas independentes</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PIX Conta (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pixConta}
                    onChange={(e) => setPixConta(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>PIX QR Code (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pixQr}
                    onChange={(e) => setPixQr(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Visa/Master */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Visa / Mastercard</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Débito (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={vmDebit}
                    onChange={(e) => setVmDebit(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Crédito à Vista (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={vmCredit1x}
                    onChange={(e) => setVmCredit1x(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                  <div key={n}>
                    <Label>{n}x (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vmInstallments[n] || ""}
                      onChange={(e) => setVmInstallments({ ...vmInstallments, [n]: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Elo/Amex */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Elo / Amex</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Débito (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={eaDebit}
                    onChange={(e) => setEaDebit(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Crédito à Vista (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={eaCredit1x}
                    onChange={(e) => setEaCredit1x(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                  <div key={n}>
                    <Label>{n}x (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={eaInstallments[n] || ""}
                      onChange={(e) => setEaInstallments({ ...eaInstallments, [n]: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={isCreating} className="flex-1 bg-violet-500 hover:bg-violet-600">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingPlan ? "Salvando..." : "Criando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingPlan ? "Salvar Alterações" : "Criar Plano"}
                  </>
                )}
              </Button>
              <Button onClick={onClose} variant="outline" disabled={isCreating}>
                Cancelar
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
