"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type {
  Transaction,
  Withdrawal,
  Profile,
  Notification,
  ClientBalances,
  PlanType,
  BalanceAdjustment,
  AdjustmentType,
  WithdrawalMethod,
  PixKeyType,
} from "@/lib/types"
import { calculateFee, type BrandGroup, type Installments } from "@/lib/pos-rates"

interface SupabaseContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  transactions: Transaction[]
  withdrawals: Withdrawal[]
  notifications: Notification[]
  clients: Profile[]
  balanceAdjustments: BalanceAdjustment[]
  customPlans: Array<{ id: string; name: string; created_at: string }>
  chargebacks: any[]
  // Transaction actions
  addTransaction: (data: {
    grossValue: number
    brand: string
    paymentType: string
    installments: number
    receiptUrl?: string
    noReceiptReason?: string
  }) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>
  uploadReceipt: (transactionId: string, receiptUrl: string) => Promise<void>
  verifyTransaction: (transactionId: string) => Promise<void>
  rejectTransaction: (transactionId: string, reason: string) => Promise<void>
  // Withdrawal actions
  requestWithdrawal: (data: {
    amount: number
    method: WithdrawalMethod
    pixKey?: string
    pixKeyType?: PixKeyType
    pixOwnerName?: string
    bankName?: string
    bankAgency?: string
    bankAccount?: string
    boletoName?: string
    boletoBeneficiaryName?: string
    boletoNumber?: string
    boletoValue?: number
    boletoOrigin?: string
  }) => Promise<void>
  payWithdrawal: (withdrawalId: string, proofUrl: string) => Promise<void>
  cancelWithdrawal: (withdrawalId: string, reason: string) => Promise<void>
  // Notification actions
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  // Balance calculation
  getClientBalances: (userId: string) => ClientBalances
  // Profile actions
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  assignClientPlan: (clientId: string, plan: PlanType) => Promise<void>
  deleteClient: (clientId: string) => Promise<void>
  // Balance adjustment actions
  addBalanceAdjustment: (userId: string, type: AdjustmentType, amount: number, reason: string) => Promise<void>
  // Chargeback actions
  registerChargeback: (transactionId: string, reason: string) => Promise<void>
  approveChargeback: (chargebackId: string) => Promise<void>
  rejectChargeback: (chargebackId: string) => Promise<void>
  // Transaction approval actions
  approveWithoutReceipt: (transactionId: string) => Promise<void>
  createCustomPlan: (data: {
    name: string
    rates: Array<{
      brand_group: "VISA_MASTER" | "ELO_AMEX"
      payment_type: "debit" | "credit" | "pix_conta" | "pix_qrcode"
      installments: number | null
      rate: number
    }>
  }) => Promise<string>
  updateCustomPlan: (
    planId: string,
    data: {
      name?: string
      rates?: Array<{
        brand_group: "VISA_MASTER" | "ELO_AMEX"
        payment_type: "debit" | "credit" | "pix_conta" | "pix_qrcode"
        installments: number | null
        rate: number
      }>
    },
  ) => Promise<void>
  deleteCustomPlan: (planId: string) => Promise<void>
  fetchCustomPlans: () => Promise<Array<{ id: string; name: string; created_at: string }>>
  // Refresh data
  refreshData: () => Promise<void>
  // Logout
  logout: () => Promise<void>
  supabase: any
}

const SupabaseContext = createContext<SupabaseContextType | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [clients, setClients] = useState<Profile[]>([])
  const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustment[]>([])
  const [customPlans, setCustomPlans] = useState<Array<{ id: string; name: string; created_at: string }>>([ ])
  const [chargebacks, setChargebacks] = useState<any[]>([])

  const supabase = createClient()

  const fetchUserData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
        return
      }

      setUser(user)

      // Buscar perfil
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profileData) {
        setProfile(profileData as Profile)
      }

      // Buscar transações
      if (profileData?.role === "admin") {
        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
        setTransactions((txData as Transaction[]) || [])

        // Admin vê todos os clientes
        const { data: clientsData } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "client")
          .order("created_at", { ascending: false })
        setClients((clientsData as Profile[]) || [])

        // Admin vê todos os saques
        const { data: wdData } = await supabase
          .from("withdrawals")
          .select("*")
          .order("created_at", { ascending: false })
        setWithdrawals((wdData as Withdrawal[]) || [])

      const { data: adjustmentsData } = await supabase
        .from("balance_adjustments")
        .select("*")
        .order("created_at", { ascending: false })
      setBalanceAdjustments((adjustmentsData as BalanceAdjustment[]) || [])

      // Admin vê todos os chargebacks
      const { data: chargebacksData } = await supabase
        .from("chargebacks")
        .select("*")
        .order("created_at", { ascending: false })
      setChargebacks(chargebacksData || [])
    } else {
        // Cliente vê apenas suas transações
        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
        setTransactions((txData as Transaction[]) || [])

      // Cliente vê apenas seus saques
      const { data: wdData } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setWithdrawals((wdData as Withdrawal[]) || [])

      const { data: adjustmentsData } = await supabase
        .from("balance_adjustments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setBalanceAdjustments((adjustmentsData as BalanceAdjustment[]) || [])

      // Cliente vê apenas seus chargebacks
      const { data: chargebacksData } = await supabase
        .from("chargebacks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setChargebacks(chargebacksData || [])
    }

      // Buscar notificações
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setNotifications((notifData as Notification[]) || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUserData()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserData()
      } else {
        setUser(null)
        setProfile(null)
        setTransactions([])
        setWithdrawals([])
        setNotifications([])
        setClients([])
        setBalanceAdjustments([])
        setCustomPlans([])
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUserData])

  const debouncedRefreshData = useCallback(() => {
    const timeoutId = setTimeout(() => {
      fetchUserData()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [])

  const refreshData = async () => {
    await fetchUserData()
  }

  const addTransaction = async (data: {
    grossValue: number
    brand: string
    paymentType: string
    installments: number
    receiptFile?: File
    noReceiptReason?: string
  }) => {
    if (!user || !profile) return

    // Verifica se cliente tem plano atribuído
    if (profile.role === "client" && !profile.plan) {
      throw new Error("Você ainda não possui um plano atribuído. Aguarde o gestor configurar seu plano.")
    }

    // Determinar brandGroup e paymentType corretos
    let brandGroup: BrandGroup
    let feePaymentType: "debit" | "credit" | "pix_qrcode" | "pix_conta"
    
    if (data.brand === "pix") {
      brandGroup = "PIX" as BrandGroup
      feePaymentType = data.paymentType as "pix_qrcode" | "pix_conta"
    } else {
      brandGroup = data.brand === "visa_master" ? "VISA_MASTER" : "ELO_AMEX"
      feePaymentType = data.paymentType as "debit" | "credit"
    }
    
    const calculation = calculateFee(
      data.grossValue,
      brandGroup,
      feePaymentType as any,
      data.installments as Installments,
      profile.plan,
    )

    let receiptUrl: string | null = null

    // Fazer upload do comprovante para o Supabase Storage
    if (data.receiptFile) {
      console.log("[v0] 📤 Uploading receipt to Supabase Storage...")
      const fileName = `${user.id}/${Date.now()}-${data.receiptFile.name}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("transaction-receipts")
        .upload(fileName, data.receiptFile, {
          upsert: true,
          contentType: data.receiptFile.type
        })

      if (uploadError) {
        console.error("[v0] ❌ Upload error:", uploadError)
        throw new Error(`Erro ao fazer upload do comprovante: ${uploadError.message}`)
      }

      console.log("[v0] ✅ Receipt uploaded successfully:", uploadData.path)
      
      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from("transaction-receipts")
        .getPublicUrl(uploadData.path)

      receiptUrl = publicUrlData.publicUrl
      console.log("[v0] 🔗 Public URL:", receiptUrl)
    }

    const status = receiptUrl ? "pending_verification" : "pending_receipt"

    console.log("[v0] 🔍 About to insert transaction with brand:", data.brand, "payment_type:", data.paymentType)

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      gross_value: data.grossValue,
      brand: data.brand,
      payment_type: data.paymentType,
      installments: data.installments,
      fee_percentage: calculation.feePercentage,
      fee_value: calculation.feeAmount,
      net_value: calculation.netAmount,
      receipt_url: receiptUrl,
      no_receipt_reason: data.noReceiptReason || null,
      status,
      is_chargeback: false,
    })

    if (error) throw error

    console.log("[v0] 📝 Transaction created, fetching admins to notify...")
    const { data: admins, error: adminsError } = await supabase.from("profiles").select("id").eq("role", "admin")

    if (adminsError) {
      console.error("[v0] ❌ Error fetching admins:", adminsError)
    } else {
      console.log("[v0] 👥 Found admins:", admins?.length || 0)
    }

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        console.log("[v0] 🔔 Creating notification for admin:", admin.id)
        const { error: notifError, data: notifData } = await supabase
          .from("notifications")
          .insert({
            user_id: admin.id,
            type: data.receiptUrl ? "transaction_pending" : "transaction_no_receipt",
            title: data.receiptUrl ? "Nova Transação Pendente" : "Nova Transação sem Comprovante",
            message: `${profile?.full_name || "Cliente"} adicionou uma transação de R$ ${data.grossValue.toFixed(2)}${data.receiptUrl ? " com comprovante" : " sem comprovante"}`,
          })
          .select()

        if (notifError) {
          console.error("[v0] ❌ Error creating notification:", notifError)
        } else {
          console.log("[v0] ✅ Notification created successfully:", notifData)
        }
      }
    }

    await refreshData()
  }

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const { error } = await supabase.from("transactions").update(updates).eq("id", id)

    if (error) throw error
    await refreshData()
  }

  const uploadReceipt = async (transactionId: string, receiptUrl: string) => {
    if (!user) return

    const { error } = await supabase
      .from("transactions")
      .update({
        receipt_url: receiptUrl,
        status: "pending_verification",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (error) throw error

    // Notifica admins
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")

    if (admins) {
      for (const admin of admins) {
        await supabase.from("notifications").insert({
          user_id: admin.id,
          type: "receipt_uploaded",
          title: "Novo Comprovante",
          message: `${profile?.full_name || "Cliente"} enviou um comprovante de transação`,
          related_id: transactionId,
        })
      }
    }

    await refreshData()
  }

  const verifyTransaction = async (transactionId: string) => {
    if (!user) return

    const transaction = transactions.find((t) => t.id === transactionId)
    if (!transaction) return

    const { error } = await supabase
      .from("transactions")
      .update({
        status: "verified",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (error) throw error

    await supabase.from("notifications").insert({
      user_id: transaction.user_id,
      type: "transaction_approved",
      title: "Transação Aprovada",
      message: `Sua transação de R$ ${transaction.gross_value.toFixed(2)} foi aprovada. Valor líquido: R$ ${transaction.net_value.toFixed(2)}`,
      related_id: transactionId,
    })

    await refreshData()
  }

  const rejectTransaction = async (transactionId: string, reason: string) => {
    if (!user) return

    const transaction = transactions.find((t) => t.id === transactionId)
    if (!transaction) return

    const { error } = await supabase
      .from("transactions")
      .update({
        status: "rejected",
        rejection_reason: reason,
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (error) throw error

    await supabase.from("notifications").insert({
      user_id: transaction.user_id,
      type: "transaction_rejected",
      title: "Transação Rejeitada",
      message: `Sua transação de R$ ${transaction.gross_value.toFixed(2)} foi rejeitada. Motivo: ${reason}`,
      related_id: transactionId,
    })

    await refreshData()
  }

  const requestWithdrawal = async (data: {
    amount: number
    method: WithdrawalMethod
    pixKey?: string
    pixKeyType?: PixKeyType
    pixOwnerName?: string
    bankName?: string
    bankAgency?: string
    bankAccount?: string
    boletoName?: string
    boletoBeneficiaryName?: string
    boletoNumber?: string
    boletoValue?: number
    boletoOrigin?: string
  }) => {
    if (!user) return

    console.log("[v0] 🚀 requestWithdrawal called with amount:", data.amount, "method:", data.method)

    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount: data.amount,
      status: "pending",
      withdrawal_method: data.method,
      pix_key: data.pixKey || null,
      pix_key_type: data.pixKeyType || null,
      pix_owner_name: data.pixOwnerName || null,
      bank_name: data.bankName || null,
      bank_agency: data.bankAgency || null,
      bank_account: data.bankAccount || null,
      boleto_name: data.boletoName || null,
      boleto_beneficiary_name: data.boletoBeneficiaryName || null,
      boleto_number: data.boletoNumber || null,
      boleto_value: data.boletoValue || null,
      boleto_origin: data.boletoOrigin || null,
    })

    if (error) {
      console.error("[v0] ❌ Error creating withdrawal:", error)
      throw error
    }

    console.log("[v0] ✅ Withdrawal created successfully")

    console.log("[v0] 📢 Fetching admins to notify...")
    const { data: admins, error: adminsError } = await supabase.from("profiles").select("id").eq("role", "admin")

    if (adminsError) {
      console.error("[v0] ❌ Error fetching admins:", adminsError)
    } else {
      console.log("[v0] 👥 Found admins:", admins?.length || 0, admins)
    }

    if (admins && admins.length > 0) {
      console.log("[v0] 🔔 Creating notifications for admins...")
      for (const admin of admins) {
        console.log("[v0] 📨 Creating notification for admin:", admin.id)
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: admin.id,
          type: "withdrawal_requested",
          title: "Nova Solicitação de Saque",
          message: `${profile?.full_name || "Cliente"} solicitou um saque de R$ ${data.amount.toFixed(2)}`,
        })

        if (notifError) {
          console.error("[v0] ❌ Error creating notification for admin:", admin.id, notifError)
        } else {
          console.log("[v0] ✅ Notification created successfully for admin:", admin.id)
        }
      }
    } else {
      console.log("[v0] ⚠️ No admins found to notify")
    }

    console.log("[v0] 🔄 Refreshing data...")
    await refreshData()
    console.log("[v0] ✅ Data refreshed")
  }

  const payWithdrawal = async (withdrawalId: string, proofUrl: string) => {
    if (!user) return

    const withdrawal = withdrawals.find((w) => w.id === withdrawalId)
    if (!withdrawal) return

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "paid",
        admin_proof_url: proofUrl,
        paid_by: user.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId)

    if (error) throw error

    // Marca transações como pagas (até o valor do saque)
    let remaining = withdrawal.amount
    const userTransactions = transactions
      .filter((t) => t.user_id === withdrawal.user_id && t.status === "verified")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    for (const tx of userTransactions) {
      if (remaining <= 0) break
      await supabase.from("transactions").update({ status: "paid" }).eq("id", tx.id)
      remaining -= tx.net_value
    }

    // Notifica o cliente
    await supabase.from("notifications").insert({
      user_id: withdrawal.user_id,
      type: "withdrawal_paid",
      title: "Saque Realizado",
      message: `Seu saque de R$ ${withdrawal.amount.toFixed(2)} foi processado e pago.`,
      related_id: withdrawalId,
    })

    await refreshData()
  }

  const cancelWithdrawal = async (withdrawalId: string, reason: string) => {
    if (!user) return

    const withdrawal = withdrawals.find((w) => w.id === withdrawalId)
    if (!withdrawal) return

    const { error } = await supabase.rpc("cancel_withdrawal_with_reason", {
      withdrawal_id: withdrawalId,
      cancel_reason: reason,
    })

    if (error) {
      console.error("[v0] Erro ao cancelar saque:", error)
      throw error
    }

    // Notify the client
    await supabase.from("notifications").insert({
      user_id: withdrawal.user_id,
      type: "withdrawal_cancelled",
      title: "Saque Cancelado",
      message: `Seu saque de R$ ${withdrawal.amount.toFixed(2)} foi cancelado. Motivo: ${reason}`,
      related_id: withdrawalId,
    })

    await refreshData()
  }

  const markNotificationRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    await refreshData()
  }

  const markAllNotificationsRead = async () => {
    if (!user) return
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id)
    await refreshData()
  }

  const getClientBalances = (userId: string): ClientBalances => {
    // Busca o perfil do cliente para obter balance e pending_balance
    const clientProfile = clients.find((c) => c.id === userId) || profile

    if (!clientProfile) {
      console.warn("[v0] Cliente não encontrado:", userId)
      return {
        available: 0,
        pending: 0,
        withdrawn: 0,
        total: 0,
      }
    }

    // Os triggers do Supabase já calculam balance (disponível) e pending_balance (pendente)
    const available = clientProfile.balance || 0
    const pending = clientProfile.pending_balance || 0

    // Calcular apenas withdrawn e total (que não são gerenciados por triggers)
    const clientTransactions = transactions.filter((t) => t.user_id === userId)
    const clientWithdrawals = withdrawals.filter((w) => w.user_id === userId)

    const withdrawn = clientWithdrawals.filter((w) => w.status === "paid").reduce((sum, w) => sum + w.amount, 0)

    // Verificar quais transações têm chargeback aprovado
    const approvedChargebackTxIds = chargebacks
      .filter((cb) => cb.status === "approved")
      .map((cb) => cb.transaction_id)

    const total = clientTransactions
      .filter((t) => t.status !== "rejected" && !t.is_chargeback && !approvedChargebackTxIds.includes(t.id))
      .reduce((sum, t) => sum + t.gross_value, 0)

    console.log("[v0] Balance from database for user:", userId, {
      available: available.toFixed(2),
      pending: pending.toFixed(2),
      withdrawn: withdrawn.toFixed(2),
      total: total.toFixed(2),
      source: "profiles.balance (calculated by triggers)",
    })

    return {
      available: Number(Math.max(0, available).toFixed(2)),
      pending: Number(Math.max(0, pending).toFixed(2)),
      withdrawn: Number(withdrawn.toFixed(2)),
      total: Number(total.toFixed(2)),
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (error) throw error
    await refreshData()
  }

  const assignClientPlan = async (clientId: string, plan: PlanType) => {
    if (!user || profile?.role !== "admin") return

    console.log("[v0] Atribuindo plano:", { clientId, plan })

    const { error, data } = await supabase
      .from("profiles")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", clientId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Erro ao atribuir plano:", error)
      throw error
    }

    console.log("[v0] Plano atribuído com sucesso:", data)

    // Atualiza o estado local imediatamente
    setClients((prevClients) => prevClients.map((c) => (c.id === clientId ? { ...c, plan } : c)))

    // Notifica o cliente sobre o plano atribuído
    const planNames: Record<string, string> = {
      basic: "Básico",
      intermediario: "Intermediário",
      top: "Top",
    }

    await supabase.from("notifications").insert({
      user_id: clientId,
      type: "plan_assigned",
      title: "Plano Atribuído",
      message: plan
        ? `Você foi atribuído ao plano ${planNames[plan]}. Agora você pode registrar suas transações.`
        : "Seu plano foi removido. Entre em contato com o gestor.",
    })

    // Recarrega os dados para garantir sincronização
    await refreshData()
  }

  const createCustomPlan = async (data: {
    name: string
    rates: Array<{
      brand_group: "VISA_MASTER" | "ELO_AMEX"
      payment_type: "debit" | "credit" | "pix_conta" | "pix_qrcode"
      installments: number | null
      rate: number
    }>
  }): Promise<string> => {
    if (!user || profile?.role !== "admin") {
      throw new Error("Apenas administradores podem criar planos personalizados")
    }

    console.log("[v0] Criando plano personalizado:", data.name)

    // Criar o plano
    const { data: planData, error: planError } = await supabase
      .from("custom_plans")
      .insert({
        name: data.name,
        created_by: user.id,
      })
      .select()
      .single()

    if (planError || !planData) {
      console.error("[v0] Erro ao criar plano:", planError)
      throw new Error(planError?.message || "Erro ao criar plano")
    }

    console.log("[v0] Plano criado:", planData.id)

    // Inserir todas as taxas
    const ratesData = data.rates.map((rate) => ({
      plan_id: planData.id,
      brand_group: rate.brand_group,
      payment_type: rate.payment_type,
      installments: rate.installments,
      rate: rate.rate,
    }))

    const { error: ratesError } = await supabase.from("custom_plan_rates").insert(ratesData)

    if (ratesError) {
      console.error("[v0] Erro ao inserir taxas:", ratesError)
      // Rollback: deletar o plano criado
      await supabase.from("custom_plans").delete().eq("id", planData.id)
      throw new Error(ratesError.message || "Erro ao criar taxas do plano")
    }

    console.log("[v0] Plano personalizado criado com sucesso!")
    await refreshData()
    return planData.id
  }

  const updateCustomPlan = async (
    planId: string,
    data: {
      name?: string
      rates?: Array<{
        brand_group: "VISA_MASTER" | "ELO_AMEX"
        payment_type: "debit" | "credit" | "pix_conta" | "pix_qrcode"
        installments: number | null
        rate: number
      }>
    },
  ) => {
    if (!user || profile?.role !== "admin") {
      throw new Error("Apenas administradores podem editar planos personalizados")
    }

    // Update name if provided
    if (data.name) {
      const { error: nameError } = await supabase
        .from("custom_plans")
        .update({ name: data.name, updated_at: new Date().toISOString() })
        .eq("id", planId)

      if (nameError) throw nameError
    }

    // Update rates if provided
    if (data.rates) {
      // Delete existing rates
      await supabase.from("custom_plan_rates").delete().eq("plan_id", planId)

      // Insert new rates
      const ratesData = data.rates.map((rate) => ({
        plan_id: planId,
        brand_group: rate.brand_group,
        payment_type: rate.payment_type,
        installments: rate.installments,
        rate: rate.rate,
      }))

      const { error: ratesError } = await supabase.from("custom_plan_rates").insert(ratesData)
      if (ratesError) throw ratesError
    }

    await refreshData()
  }

  const deleteCustomPlan = async (planId: string) => {
    if (!user || profile?.role !== "admin") {
      throw new Error("Apenas administradores podem deletar planos personalizados")
    }

    // Check if any clients are using this plan
    const { data: clientsUsingPlan } = await supabase.from("profiles").select("id").eq("plan", planId).limit(1)

    if (clientsUsingPlan && clientsUsingPlan.length > 0) {
      throw new Error("Não é possível deletar um plano que está sendo usado por clientes")
    }

    const { error } = await supabase.from("custom_plans").delete().eq("id", planId)
    if (error) throw error

    await refreshData()
  }

  const fetchCustomPlans = async () => {
    const { data, error } = await supabase
      .from("custom_plans")
      .select("id, name, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Erro ao buscar planos personalizados:", error)
      return []
    }

    return data || []
  }

  const addBalanceAdjustment = async (userId: string, type: "add" | "remove", amount: number, reason: string) => {
    if (!user || profile?.role !== "admin") {
      throw new Error("Apenas administradores podem ajustar saldos")
    }

    console.log("[v0] Adding balance adjustment:", { userId, type, amount, reason })

    const { data: adjustment, error: adjustmentError } = await supabase
      .from("balance_adjustments")
      .insert({
        user_id: userId,
        admin_id: user.id,
        type,
        amount,
        reason,
      })
      .select()
      .single()

    if (adjustmentError) {
      console.error("[v0] Error creating adjustment:", adjustmentError)
      throw adjustmentError
    }

    console.log("[v0] Balance adjustment successful, trigger will update balance automatically")
    await refreshData()
    return adjustment
  }

  const registerChargeback = async (transactionId: string, reason: string) => {
    console.log("[v0] Registering chargeback request for transaction:", transactionId)

    if (!user) {
      throw new Error("Usuário não autenticado")
    }

    // Criar solicitação de estorno na tabela chargebacks
    const { error } = await supabase.from("chargebacks").insert({
      transaction_id: transactionId,
      user_id: user.id,
      reason: reason,
      status: "pending",
    })

    if (error) {
      console.error("[v0] Error creating chargeback request:", error.message)
      throw error
    }

    await refreshData()
  }

  const approveChargeback = async (chargebackId: string) => {
    console.log("[v0] Approving chargeback:", chargebackId)

    if (!user) {
      throw new Error("Usuário não autenticado")
    }

    // Buscar o chargeback para obter o transaction_id
    const { data: chargebackData, error: fetchError } = await supabase
      .from("chargebacks")
      .select("transaction_id")
      .eq("id", chargebackId)
      .single()

    if (fetchError || !chargebackData) {
      console.error("[v0] Error fetching chargeback:", fetchError?.message)
      throw fetchError || new Error("Chargeback não encontrado")
    }

    // Atualizar status do chargeback
    const { error: chargebackError } = await supabase
      .from("chargebacks")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", chargebackId)

    if (chargebackError) {
      console.error("[v0] Error approving chargeback:", chargebackError.message)
      throw chargebackError
    }

    // Marcar a transação como estornada
    const { error: txError } = await supabase
      .from("transactions")
      .update({
        is_chargeback: true,
        chargeback_reason: "Aprovado pelo admin",
        chargeback_at: new Date().toISOString(),
      })
      .eq("id", chargebackData.transaction_id)

    if (txError) {
      console.error("[v0] Error updating transaction:", txError.message)
      throw txError
    }

    await refreshData()
  }

  const rejectChargeback = async (chargebackId: string) => {
    console.log("[v0] Rejecting chargeback:", chargebackId)

    if (!user) {
      throw new Error("Usuário não autenticado")
    }

    // Atualizar status do chargeback
    const { error } = await supabase
      .from("chargebacks")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", chargebackId)

    if (error) {
      console.error("[v0] Error rejecting chargeback:", error.message)
      throw error
    }

    await refreshData()
  }

  const deleteClient = async (clientId: string) => {
    console.log("[v0] Deleting client:", clientId)

    const { error } = await supabase.from("profiles").delete().eq("id", clientId)

    if (error) {
      console.error("[v0] Error deleting client:", error.message)
      throw new Error(`Erro ao excluir cliente: ${error.message}`)
    }

    console.log("[v0] Client deleted successfully")
    await refreshData()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  const fetchBalance = useCallback(async () => {
    // Placeholder for balance fetching logic
  }, [])

  const contextValue: SupabaseContextType = {
    user,
    profile,
    isLoading,
    transactions,
    withdrawals,
    notifications,
    clients,
    balanceAdjustments,
    customPlans,
    chargebacks,
    addTransaction,
    updateTransaction,
    uploadReceipt,
    verifyTransaction,
    rejectTransaction,
    requestWithdrawal,
    payWithdrawal,
    cancelWithdrawal,
    markNotificationRead,
    markAllNotificationsRead,
    getClientBalances,
    updateProfile,
    assignClientPlan,
    createCustomPlan,
    updateCustomPlan,
    deleteCustomPlan,
    fetchCustomPlans,
    addBalanceAdjustment,
    registerChargeback,
    approveChargeback,
    rejectChargeback,
    deleteClient,
    refreshData,
    logout,
    supabase: createClient(),
  }

  return <SupabaseContext.Provider value={contextValue}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}
