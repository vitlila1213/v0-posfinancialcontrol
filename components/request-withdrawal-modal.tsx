"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Wallet, Check, AlertTriangle, CreditCard, QrCode, Loader2, FileText, Save, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/pos-rates"
import { useSupabase } from "@/lib/supabase-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase-client"
import type { WithdrawalMethod, PixKeyType } from "@/lib/types"

interface SavedPixKey {
  id: string
  key_type: PixKeyType
  key_value: string
  owner_name: string
  is_default: boolean
}

interface RequestWithdrawalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableBalance: number
}

export function RequestWithdrawalModal({ open, onOpenChange, availableBalance }: RequestWithdrawalModalProps) {
  const { profile, requestWithdrawal } = useSupabase()
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<WithdrawalMethod>("pix")
  const [pixKey, setPixKey] = useState(profile?.pix_key || "")
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf")
  const [pixOwnerName, setPixOwnerName] = useState(profile?.full_name || "")
  const [bankName, setBankName] = useState(profile?.bank_name || "")
  const [bankAgency, setBankAgency] = useState(profile?.bank_agency || "")
  const [bankAccount, setBankAccount] = useState(profile?.bank_account || "")
  const [boletoName, setBoletoName] = useState("")
  const [boletoBeneficiaryName, setBoletoBeneficiaryName] = useState("")
  const [boletoNumber, setBoletoNumber] = useState("")
  const [boletoValue, setBoletoValue] = useState("")
  const [boletoOrigin, setBoletoOrigin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedPixKeys, setSavedPixKeys] = useState<SavedPixKey[]>([])
  const [selectedSavedKey, setSelectedSavedKey] = useState<string>("")
  const [saveThisKey, setSaveThisKey] = useState(false)
  const [showNewKeyForm, setShowNewKeyForm] = useState(true)
  const supabase = createClient()

  // Load saved PIX keys when modal opens
  useEffect(() => {
    if (open && profile?.id) {
      loadSavedPixKeys()
    }
  }, [open, profile?.id])

  const loadSavedPixKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_pix_keys")
        .select("*")
        .eq("user_id", profile?.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      setSavedPixKeys(data || [])
      
      // Auto-select default key if exists
      const defaultKey = data?.find(k => k.is_default)
      if (defaultKey) {
        handleSelectSavedKey(defaultKey.id)
        setShowNewKeyForm(false)
      }
    } catch (error) {
      console.error("[v0] Error loading saved PIX keys:", error)
    }
  }

  const handleSelectSavedKey = (keyId: string) => {
    setSelectedSavedKey(keyId)
    const key = savedPixKeys.find(k => k.id === keyId)
    if (key) {
      setPixKey(key.key_value)
      setPixKeyType(key.key_type)
      setPixOwnerName(key.owner_name)
      setShowNewKeyForm(false)
    }
  }

  const handleSavePixKey = async () => {
    if (!saveThisKey || !pixKey || !pixOwnerName) return

    try {
      const { error } = await supabase
        .from("saved_pix_keys")
        .insert({
          user_id: profile?.id,
          key_type: pixKeyType,
          key_value: pixKey,
          owner_name: pixOwnerName,
          is_default: savedPixKeys.length === 0, // First key becomes default
        })

      if (error) throw error
      await loadSavedPixKeys()
    } catch (error) {
      console.error("[v0] Error saving PIX key:", error)
    }
  }

  const numericAmount = Number.parseFloat(amount) || 0
  const isValidAmount = numericAmount > 0 && numericAmount <= availableBalance

  const isValidPayment =
    paymentMethod === "pix"
      ? pixKey.length > 0 && pixOwnerName.length > 0
      : paymentMethod === "bank"
        ? bankName && bankAgency && bankAccount
        : boletoName && boletoBeneficiaryName && boletoNumber && boletoValue && boletoOrigin

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  const handleSubmit = async () => {
    if (!isValidAmount || !isValidPayment) return

    setIsSubmitting(true)
    try {
      // Save PIX key if requested
      if (paymentMethod === "pix" && saveThisKey && !selectedSavedKey) {
        await handleSavePixKey()
      }

      await requestWithdrawal({
        amount: numericAmount,
        method: paymentMethod,
        pixKey: paymentMethod === "pix" ? pixKey : undefined,
        pixKeyType: paymentMethod === "pix" ? pixKeyType : undefined,
        pixOwnerName: paymentMethod === "pix" ? pixOwnerName : undefined,
        bankName: paymentMethod === "bank" ? bankName : undefined,
        bankAgency: paymentMethod === "bank" ? bankAgency : undefined,
        bankAccount: paymentMethod === "bank" ? bankAccount : undefined,
        boletoName: paymentMethod === "boleto" ? boletoName : undefined,
        boletoBeneficiaryName: paymentMethod === "boleto" ? boletoBeneficiaryName : undefined,
        boletoNumber: paymentMethod === "boleto" ? boletoNumber : undefined,
        boletoValue: paymentMethod === "boleto" ? Number.parseFloat(boletoValue) : undefined,
        boletoOrigin: paymentMethod === "boleto" ? boletoOrigin : undefined,
      })

      setAmount("")
      setSaveThisKey(false)
      onOpenChange(false)
    } catch (error) {
      console.error("Erro ao solicitar saque:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-[60] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 sm:h-10 sm:w-10">
                  <Wallet className="h-4 w-4 text-rose-500 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">Solicitar Saque</h2>
                  <p className="text-xs text-muted-foreground sm:text-sm">Transferir para sua conta</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground sm:p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:mb-6 sm:p-4">
              <p className="text-xs text-muted-foreground sm:text-sm">Saldo Disponível</p>
              <p className="text-xl font-bold text-emerald-500 sm:text-2xl">{formatCurrency(availableBalance)}</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground sm:text-sm">Valor do Saque (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={availableBalance}
                  className="mt-1 h-10 border-white/10 bg-white/5 text-base font-semibold sm:mt-1.5 sm:h-12 sm:text-lg"
                />
              </div>

              {numericAmount > availableBalance && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-500 sm:p-3 sm:text-sm"
                >
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Valor excede o saldo disponível
                </motion.div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground sm:text-sm">Método de Recebimento</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:mt-2">
                  <button
                    onClick={() => setPaymentMethod("pix")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all sm:gap-2 sm:p-3 sm:text-sm",
                      paymentMethod === "pix"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                    )}
                  >
                    <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    PIX
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all sm:gap-2 sm:p-3 sm:text-sm",
                      paymentMethod === "bank"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                    )}
                  >
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Banco
                  </button>
                  <button
                    onClick={() => setPaymentMethod("boleto")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all sm:gap-2 sm:p-3 sm:text-sm",
                      paymentMethod === "boleto"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Boleto
                  </button>
                </div>
              </div>

              {paymentMethod === "pix" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  {savedPixKeys.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Chaves PIX Salvas</Label>
                        <select
                          value={selectedSavedKey}
                          onChange={(e) => {
                            if (e.target.value === "new") {
                              setSelectedSavedKey("")
                              setShowNewKeyForm(true)
                              setPixKey("")
                              setPixOwnerName(profile?.full_name || "")
                            } else {
                              handleSelectSavedKey(e.target.value)
                            }
                          }}
                          className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-800 p-2.5 text-sm text-foreground [&>option]:bg-slate-800 [&>option]:text-foreground"
                        >
                          <option value="">Selecione uma chave</option>
                          {savedPixKeys.map((key) => (
                            <option key={key.id} value={key.id}>
                              {key.owner_name} - {key.key_type.toUpperCase()} - {key.key_value.substring(0, 15)}...
                            </option>
                          ))}
                          <option value="new">+ Nova chave PIX</option>
                        </select>
                    </div>
                  )}

                  {showNewKeyForm && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground sm:text-sm">Tipo de Chave PIX</Label>
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPixKeyType("cpf")}
                            className={cn(
                              "rounded-lg border p-2 text-xs font-medium transition-all",
                              pixKeyType === "cpf"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            CPF
                          </button>
                          <button
                            onClick={() => setPixKeyType("phone")}
                            className={cn(
                              "rounded-lg border p-2 text-xs font-medium transition-all",
                              pixKeyType === "phone"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            Telefone
                          </button>
                          <button
                            onClick={() => setPixKeyType("email")}
                            className={cn(
                              "rounded-lg border p-2 text-xs font-medium transition-all",
                              pixKeyType === "email"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            E-mail
                          </button>
                          <button
                            onClick={() => setPixKeyType("random")}
                            className={cn(
                              "rounded-lg border p-2 text-xs font-medium transition-all",
                              pixKeyType === "random"
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20",
                            )}
                          >
                            Aleatória
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground sm:text-sm">Nome do Titular da Chave PIX</Label>
                        <Input
                          placeholder="Nome completo do titular"
                          value={pixOwnerName}
                          onChange={(e) => setPixOwnerName(e.target.value)}
                          className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground sm:text-sm">Chave PIX</Label>
                        <Input
                          placeholder={
                            pixKeyType === "cpf"
                              ? "000.000.000-00"
                              : pixKeyType === "phone"
                                ? "(00) 00000-0000"
                                : pixKeyType === "email"
                                  ? "email@exemplo.com"
                                  : "Chave Aleatória"
                          }
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                        />
                      </div>

                      {!selectedSavedKey && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="saveKey"
                            checked={saveThisKey}
                            onChange={(e) => setSaveThisKey(e.target.checked)}
                            className="h-4 w-4 rounded border-white/10 bg-white/5 text-emerald-500"
                          />
                          <label htmlFor="saveKey" className="text-xs text-muted-foreground sm:text-sm cursor-pointer">
                            Salvar esta chave PIX para uso futuro
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {paymentMethod === "bank" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <div>
                    <Label className="text-xs text-muted-foreground sm:text-sm">Nome do Banco</Label>
                    <Input
                      placeholder="Ex: Banco do Brasil"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Agência</Label>
                      <Input
                        placeholder="0000"
                        value={bankAgency}
                        onChange={(e) => setBankAgency(e.target.value)}
                        className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground sm:text-sm">Conta</Label>
                      <Input
                        placeholder="00000-0"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {paymentMethod === "boleto" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <div>
                    <Label className="text-xs text-muted-foreground sm:text-sm">Nome do Boleto</Label>
                    <Input
                      placeholder="Ex: Boleto Conta de Luz"
                      value={boletoName}
                      onChange={(e) => setBoletoName(e.target.value)}
                      className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:text-sm">Nome do Beneficiário</Label>
                    <Input
                      placeholder="Nome completo do beneficiário"
                      value={boletoBeneficiaryName}
                      onChange={(e) => setBoletoBeneficiaryName(e.target.value)}
                      className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:text-sm">
                      Número do Boleto (Código de Barras)
                    </Label>
                    <Input
                      placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                      value={boletoNumber}
                      onChange={(e) => setBoletoNumber(e.target.value)}
                      className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:text-sm">Valor do Boleto (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={boletoValue}
                      onChange={(e) => setBoletoValue(e.target.value)}
                      className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:text-sm">Origem do Boleto</Label>
                    <Input
                      placeholder="Ex: Boleto conta pessoal, Conta de luz, Conta de água"
                      value={boletoOrigin}
                      onChange={(e) => setBoletoOrigin(e.target.value)}
                      className="mt-1 border-white/10 bg-white/5 text-sm sm:mt-1.5"
                    />
                  </div>
                </motion.div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!isValidAmount || !isValidPayment || isSubmitting}
                className="w-full bg-rose-500 text-xs text-white hover:bg-rose-600 sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                    Solicitando...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    Solicitar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
