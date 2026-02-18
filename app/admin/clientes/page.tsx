"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Wallet,
  Clock,
  TrendingUp,
  X,
  Crown,
  Check,
  AlertCircle,
  Download,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  EyeOff,
  CreditCard,
  DollarSign,
} from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Input } from "@/components/ui/input"
import { AnimatedNumber } from "@/components/animated-number"
import { formatCurrency, PLAN_NAMES, type PlanType } from "@/lib/pos-rates"
import { motion, AnimatePresence } from "framer-motion"
import type { Profile, Transaction, CustomPlan } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn, formatBrandName, formatPaymentType } from "@/lib/utils"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { BalanceAdjustmentModal } from "@/components/balance-adjustment-modal"
import { CustomPlanModal } from "@/components/custom-plan-modal" // Import custom plan modal
import { createClient } from "@/lib/supabase/client" // Import supabase client
import { Badge } from "@/components/ui/badge" // Import Badge component
import Link from "next/link" // Import Link for navigation
import { toast } from "sonner" // Import toast for notifications

export default function AdminClientesPage() {
  const { clients, transactions, getClientBalances, assignClientPlan, isLoading, refreshData, deleteClient } =
    useSupabase()
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<string | null>(null) // Added plan filter state
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)
  const [adjustmentClient, setAdjustmentClient] = useState<Profile | null>(null)
  const [planModalClient, setPlanModalClient] = useState<Profile | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })
  const [customPlans, setCustomPlans] = useState<CustomPlan[]>([])
  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false)
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CustomPlan | null>(null)

  // Added state for search query, selected plan filter, and hide balances toggle
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all")
  const [hideBalances, setHideBalances] = useState(false)

  useEffect(() => {
    fetchCustomPlans()
  }, [])

  const fetchCustomPlans = async () => {
    setIsLoadingPlans(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("custom_plans").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setCustomPlans((data as CustomPlan[]) || [])
    } catch (error) {
      console.error("[v0] Error fetching custom plans:", error)
    } finally {
      setIsLoadingPlans(false)
    }
  }

  useEffect(() => {
    if (selectedClient || planModalClient) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [selectedClient, planModalClient])

  console.log(
    "[v0] Clientes carregados:",
    clients.map((c) => ({ id: c.id, name: c.full_name, plan: c.plan })),
  )

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  // Filter clients by search query and plan
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)

    if (searchQuery && !matchesSearch) return false

    const matchesPlanFilter = selectedPlanFilter === "all" || c.plan === selectedPlanFilter

    return matchesPlanFilter
  })

  // Separate clients by plan status
  const clientsWithoutPlan = filteredClients.filter((c) => !c.plan)
  const clientsWithPlan = filteredClients.filter((c) => c.plan)

  const getClientTransactions = (userId: string): Transaction[] => {
    return transactions.filter((t) => t.user_id === userId)
  }

  const getPendingBalance = (clientId: string) => {
    const pendingTransactions = transactions.filter(
      (t) => t.user_id === clientId && t.status === "pending_verification",
    )
    const total = pendingTransactions.reduce((sum, t) => sum + t.net_value, 0)
    return Number(total.toFixed(2))
  }

  const getFilteredTransactions = (userId: string): Transaction[] => {
    let filtered = transactions.filter((t) => t.user_id === userId)

    if (dateRange.from) {
      filtered = filtered.filter((t) => new Date(t.created_at) >= dateRange.from)
    }

    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter((t) => new Date(t.created_at) <= endOfDay)
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const downloadExtract = () => {
    if (!selectedClient) return

    const filteredTx = getFilteredTransactions(selectedClient.id)

    if (filteredTx.length === 0) {
      alert("Nenhuma transação encontrada no período selecionado")
      return
    }

    // Criar PDF
    const doc = new jsPDF()

    // Adicionar logo (base64 da logo PagNextLevel)
    const logoBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" // Placeholder - será substituído pela logo real

    try {
      doc.addImage("/images/whatsapp-20image-202025-12-10-20at-2011.png", "PNG", 15, 10, 40, 12)
    } catch (e) {
      // Se falhar, apenas continua sem logo
    }

    // Título
    doc.setFontSize(20)
    doc.setTextColor(139, 92, 246) // Roxo da marca
    doc.text("Extrato de Transações", 15, 35)

    // Informações do cliente
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Cliente: ${selectedClient.full_name || selectedClient.email}`, 15, 45)
    doc.text(
      `Período: ${format(dateRange.from || new Date(), "dd/MM/yyyy")} a ${format(dateRange.to || new Date(), "dd/MM/yyyy")}`,
      15,
      52,
    )
    doc.text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 15, 59)

    // Linha separadora
    doc.setDrawColor(200, 200, 200)
    doc.line(15, 65, 195, 65)

    // Preparar dados da tabela
    const tableData = filteredTx.map((tx) => [
      format(new Date(tx.created_at), "dd/MM/yyyy", { locale: ptBR }),
      `R$ ${tx.gross_value.toFixed(2)}`,
      `R$ ${tx.net_value.toFixed(2)}`,
      `R$ ${tx.fee_value.toFixed(2)}`,
      formatBrandName(tx.brand),
      formatPaymentType(tx.payment_type, tx.installments),
      tx.installments?.toString() || "1",
      tx.status === "verified"
        ? "Verificado"
        : tx.status === "pending_receipt"
          ? "Pend. Comp."
          : tx.status === "pending_verification"
            ? "Pend. Verif."
            : tx.status === "paid"
              ? "Pago"
              : "Rejeitado",
    ])

    // Calcular totais
    const totalGross = filteredTx.reduce((sum, tx) => sum + tx.gross_value, 0)
    const totalNet = filteredTx.reduce((sum, tx) => sum + tx.net_value, 0)
    const totalFees = filteredTx.reduce((sum, tx) => sum + tx.fee_value, 0)

    // Adicionar tabela usando autoTable
    autoTable(doc, {
      startY: 70,
      head: [["Data", "Valor Bruto", "Valor Líquido", "Taxa", "Bandeira", "Tipo", "Parc.", "Status"]],
      body: tableData,
      foot: [
        [
          "TOTAIS",
          `R$ ${totalGross.toFixed(2)}`,
          `R$ ${totalNet.toFixed(2)}`,
          `R$ ${totalFees.toFixed(2)}`,
          "",
          "",
          "",
          "",
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [139, 92, 246], // Roxo da marca
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [60, 60, 60],
        fontSize: 9,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 15, right: 15 },
    })

    // Rodapé
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `PagNextLevel - Gestão Financeira | Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      )
    }

    // Download
    doc.save(
      `extrato_${selectedClient.full_name?.replace(/\s+/g, "_") || "cliente"}_${format(new Date(), "dd-MM-yyyy")}.pdf`,
    )
  }

  const handleAssignPlan = async () => {
    if (!planModalClient || !selectedPlan) return
    setIsAssigning(true)
    setAssignError(null)

    console.log("[v0] Iniciando atribuição de plano:", { clientId: planModalClient.id, plan: selectedPlan })

    try {
      await assignClientPlan(planModalClient.id, selectedPlan)
      console.log("[v0] Plano atribuído com sucesso!")
      setPlanModalClient(null)
      setSelectedPlan(null)
    } catch (error) {
      console.error("[v0] Erro ao atribuir plano:", error)
      setAssignError(error instanceof Error ? error.message : "Erro ao atribuir plano")
    } finally {
      setIsAssigning(false)
    }
  }

  const openPlanModal = (client: Profile) => {
    setPlanModalClient(client)
    setSelectedPlan(client.plan)
    setAssignError(null)
    setEditingPlan(null) // Clear editing state when opening new plan modal
  }

  const getPlanDisplayName = (planId: PlanType): string => {
    if (!planId) return "Sem Plano"
    if (planId === "top" || planId === "intermediario" || planId === "basic") {
      return PLAN_NAMES[planId]
    }
    // Custom plan - find by UUID
    const customPlan = customPlans.find((p) => p.id === planId)
    return customPlan?.name || "Plano Personalizado"
  }

  const getPlanBadgeColor = (plan: PlanType) => {
    switch (plan) {
      case "top":
        return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
      case "intermediario":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
      case "basic":
        return "bg-amber-500/20 text-amber-500 border-amber-500/30"
      default:
        // Custom plan
        return "bg-purple-500/20 text-purple-500 border-purple-500/30"
    }
  }

  const handleDeleteCustomPlan = async (planId: string) => {
    if (!confirm("Tem certeza que deseja deletar este plano personalizado?")) return

    try {
      const supabase = createClient()

      // Check if any clients are using this plan
      const { data: clientsUsingPlan } = await supabase.from("profiles").select("id, full_name").eq("plan", planId)

      if (clientsUsingPlan && clientsUsingPlan.length > 0) {
        alert(`Não é possível deletar este plano. ${clientsUsingPlan.length} cliente(s) estão usando este plano.`)
        return
      }

      const { error } = await supabase.from("custom_plans").delete().eq("id", planId)
      if (error) throw error

      await fetchCustomPlans()
      alert("Plano deletado com sucesso!")
    } catch (error) {
      console.error("[v0] Erro ao deletar plano:", error)
      alert("Erro ao deletar plano personalizado")
    }
  }

  const handleEditCustomPlan = (plan: CustomPlan) => {
    setEditingPlan(plan)
    setShowCustomPlanModal(true)
    setPlanModalClient(null)
  }

  // Calculate balances and counts for active clients
  const clientBalances = clientsWithPlan.reduce(
    (acc, client) => {
      acc[client.id] = getClientBalances(client.id)
      return acc
    },
    {} as Record<string, ReturnType<typeof getClientBalances>>,
  )

  const clientPendingBalances = clientsWithPlan.reduce(
    (acc, client) => {
      acc[client.id] = getPendingBalance(client.id)
      return acc
    },
    {} as Record<string, number>,
  )

  const receiptsCount = clientsWithPlan.reduce(
    (acc, client) => {
      acc[client.id] = getClientTransactions(client.id).filter(
        (t) => t.status === "pending_receipt" || t.status === "pending_verification",
      ).length
      return acc
    },
    {} as Record<string, number>,
  )

  // Filter active clients based on search query and plan filter
  const filteredActiveClients = clientsWithPlan.filter((client) => {
    const matchesSearch =
      client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery)

    if (searchQuery && !matchesSearch) return false

    const matchesPlanFilter = selectedPlanFilter === "all" || client.plan === selectedPlanFilter

    return matchesPlanFilter
  })

  const activeClients = clientsWithPlan // This is already filtered by plan

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    console.log("[v0] handleDeleteClient called with:", { clientId, clientName })

    const confirmed = window.confirm(`Tem certeza que deseja excluir o cliente "${clientName}"? Esta ação não pode ser desfeita e todos os dados do cliente (transações, saques, notificações) serão permanentemente removidos.`)

    if (!confirmed) {
      console.log("[v0] Delete cancelled by user")
      return
    }

    try {
      console.log("[v0] Starting delete process for client:", clientId)
      console.log("[v0] Calling deleteClient from context...")
      
      await deleteClient(clientId)
      
      console.log("[v0] Delete successful! Client removed from database and auth")
      toast.success("Cliente excluído com sucesso!")
      
      console.log("[v0] Refreshing data...")
      await refreshData()
      
      console.log("[v0] Data refreshed successfully")
    } catch (error: any) {
      console.error("[v0] Error in handleDeleteClient:", error)
      console.error("[v0] Error stack:", error.stack)
      toast.error(`Erro ao excluir cliente: ${error.message}`)
    }
  }

    try {
      console.log("[v0] Calling deleteClient from context...")
      await deleteClient(clientId)
      console.log("[v0] Delete successful, refreshing data...")
      toast.success("Cliente excluído com sucesso") // Use toast.success directly
      refreshData()
    } catch (error: any) {
      console.error("[v0] Error in handleDeleteClient:", error)
      toast.error(`Erro ao excluir cliente: ${error.message}`) // Use toast.error directly
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Clientes</h1>
        <p className="text-sm text-muted-foreground">Gerencie os clientes e atribua planos</p>
      </div>

      {/* Clientes sem plano */}
      {clientsWithoutPlan.length > 0 && (
        <GlassCard className="border-amber-500/30 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Aguardando Atribuição de Plano ({clientsWithoutPlan.length})
              </h3>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Estes clientes precisam de um plano para começar a usar o sistema
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {clientsWithoutPlan.map((client) => (
              <div
                key={client.id}
                className="flex flex-col gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
                    {client.full_name?.[0]?.toUpperCase() || "C"}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{client.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-500">
                    Sem Plano
                  </span>
                  <Button
                    onClick={() => openPlanModal(client)}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    size="sm"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Atribuir Plano
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Clientes Ativos */}
      <GlassCard className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Clientes Ativos ({activeClients.length})
              </h3>
              <p className="text-sm text-muted-foreground">Gerencie os clientes e atribua planos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setHideBalances(!hideBalances)} className="gap-2">
            {hideBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{hideBalances ? "Mostrar" : "Ocultar"} Saldos</span>
          </Button>
        </div>

        {/* Filtros */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Filtrar por plano:</span>
            <Button
              variant={selectedPlanFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlanFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={selectedPlanFilter === "top" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlanFilter("top")}
            >
              Master
            </Button>
            <Button
              variant={selectedPlanFilter === "intermediario" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlanFilter("intermediario")}
            >
              Intermediário
            </Button>
            <Button
              variant={selectedPlanFilter === "basic" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlanFilter("basic")}
            >
              Básico
            </Button>
            {customPlans.map((plan) => (
              <Button
                key={plan.id}
                variant={selectedPlanFilter === plan.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlanFilter(plan.id)}
              >
                {plan.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Client Cards */}
        <div className="space-y-3">
          {filteredActiveClients.map((client) => (
            <div
              key={client.id}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  {client.full_name?.[0]?.toUpperCase() || "C"}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{client.full_name}</h4>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
                <Badge className={cn("text-xs", getPlanBadgeColor(client.plan))}>
                  {getPlanDisplayName(client.plan)}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Disponível</div>
                    <div className="font-semibold text-emerald-500">
                      {hideBalances ? "R$ •••" : `R$ ${clientBalances[client.id]?.available || "0,00"}`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Pendente</div>
                    <div className="font-semibold text-amber-500">
                      {hideBalances ? "R$ •••" : `R$ ${clientPendingBalances[client.id] || "0,00"}`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Comprov.</div>
                    <div className="font-semibold text-rose-500">{receiptsCount[client.id] || 0}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPlanModal(client)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Plano
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAdjustmentClient(client)}>
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link href={`/admin/clientes/${client.id}`}>Ver Painel</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      // Use the new handleDeleteClient function
                      await handleDeleteClient(client.id, client.full_name || "Cliente sem nome")
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Balance Adjustment Modal */}
      {adjustmentClient && (
        <BalanceAdjustmentModal client={adjustmentClient} onClose={() => setAdjustmentClient(null)} />
      )}

      {showCustomPlanModal && (
        <CustomPlanModal
          editingPlan={editingPlan}
          onClose={() => {
            setShowCustomPlanModal(false)
            setEditingPlan(null)
          }}
          onSuccess={() => {
            setShowCustomPlanModal(false)
            setEditingPlan(null)
            fetchCustomPlans()
          }}
        />
      )}

      {/* Plan Assignment Modal */}
      <AnimatePresence>
        {planModalClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                      <Crown className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Atribuir Plano</h2>
                      <p className="text-sm text-muted-foreground">
                        {planModalClient.full_name || planModalClient.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPlanModalClient(null)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {assignError && (
                  <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
                    {assignError}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Plano Master */}
                  <button
                    onClick={() => setSelectedPlan("top")}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      selectedPlan === "top"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-emerald-500" />
                          <span className="font-semibold text-foreground">Plano Master</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Melhores taxas - Débito Visa/Master: 1,99%</p>
                      </div>
                      {selectedPlan === "top" && <Check className="h-5 w-5 text-emerald-500" />}
                    </div>
                  </button>

                  {/* Plano Intermediário */}
                  <button
                    onClick={() => setSelectedPlan("intermediario")}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      selectedPlan === "intermediario"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          <span className="font-semibold text-foreground">Plano Intermediário</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Taxas balanceadas - Débito Visa/Master: 2,29%
                        </p>
                      </div>
                      {selectedPlan === "intermediario" && <Check className="h-5 w-5 text-blue-500" />}
                    </div>
                  </button>

                  {/* Plano Básico */}
                  <button
                    onClick={() => setSelectedPlan("basic")}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      selectedPlan === "basic"
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-amber-500" />
                          <span className="font-semibold text-foreground">Plano Básico</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Taxas padrão - Débito Visa/Master: 3,20%</p>
                      </div>
                      {selectedPlan === "basic" && <Check className="h-5 w-5 text-amber-500" />}
                    </div>
                  </button>

                  {customPlans.length > 0 && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-slate-900 px-2 text-muted-foreground">Planos Personalizados</span>
                        </div>
                      </div>

                      {customPlans.map((customPlan) => (
                        <button
                          key={customPlan.id}
                          onClick={() => setSelectedPlan(customPlan.id)}
                          className={cn(
                            "w-full rounded-xl border p-4 text-left transition-all",
                            selectedPlan === customPlan.id
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-purple-500" />
                                <span className="font-semibold text-foreground">{customPlan.name}</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Plano personalizado - Criado em {format(new Date(customPlan.created_at), "dd/MM/yyyy")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedPlan === customPlan.id && <Check className="h-5 w-5 text-purple-500" />}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCustomPlan(customPlan)
                                }}
                                className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                title="Editar plano"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCustomPlan(customPlan.id)
                                }}
                                className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/20 transition-colors"
                                title="Deletar plano"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  <button
                    onClick={() => {
                      setPlanModalClient(null)
                      setShowCustomPlanModal(true)
                    }}
                    className="w-full rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 p-4 text-left transition-all hover:border-purple-500 hover:bg-purple-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                        <Plus className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <span className="font-semibold text-purple-400">Criar Plano Personalizado</span>
                        <p className="text-xs text-muted-foreground">
                          Configure taxas personalizadas para este cliente
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={() => setPlanModalClient(null)}
                    variant="outline"
                    className="flex-1 border-white/10 bg-white/5"
                    disabled={isAssigning}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAssignPlan}
                    className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
                    disabled={!selectedPlan || isAssigning}
                  >
                    {isAssigning ? "Atribuindo..." : "Confirmar Plano"}
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Client Panel Modal */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-500">
                      {selectedClient.full_name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">{selectedClient.full_name || "Sem nome"}</h2>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium",
                            getPlanBadgeColor(selectedClient.plan),
                          )}
                        >
                          {selectedClient.plan ? getPlanDisplayName(selectedClient.plan) : "Sem Plano"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClient(null)
                      setDateRange({ from: undefined, to: undefined })
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {(() => {
                  const balances = getClientBalances(selectedClient.id)
                  const clientTx = getClientTransactions(selectedClient.id)
                  const filteredTx = getFilteredTransactions(selectedClient.id)
                  const pendingTx = clientTx.filter(
                    (t) => t.status === "pending_receipt" || t.status === "pending_verification",
                  )

                  return (
                    <>
                      {/* Balance Cards */}
                      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-xl bg-emerald-500/10 p-4">
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                            <Wallet className="h-4 w-4 text-emerald-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">Disponível</p>
                          <p className="text-lg font-bold text-emerald-500">
                            <AnimatedNumber value={balances.available} />
                          </p>
                        </div>

                        <div className="rounded-xl bg-amber-500/10 p-4">
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                            <Clock className="h-4 w-4 text-amber-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">Pendente</p>
                          <p className="text-lg font-bold text-amber-500">
                            <AnimatedNumber value={balances.pending} />
                          </p>
                        </div>

                        <div className="rounded-xl bg-blue-500/10 p-4">
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">Volume</p>
                          <p className="text-lg font-bold text-blue-500">
                            <AnimatedNumber value={balances.total} />
                          </p>
                        </div>

                        <div className="rounded-xl bg-rose-500/10 p-4">
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20">
                            <Wallet className="h-4 w-4 text-rose-500" />
                          </div>
                          <p className="text-xs text-muted-foreground">Sacado</p>
                          <p className="text-lg font-bold text-rose-500">
                            <AnimatedNumber value={balances.withdrawn} />
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-9 border-white/10 bg-white/5 text-xs">
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateRange.from
                                  ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                                  : "Data Inicial"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dateRange.from}
                                onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-9 border-white/10 bg-white/5 text-xs">
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR }) : "Data Final"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dateRange.to}
                                onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>

                          {(dateRange.from || dateRange.to) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDateRange({ from: undefined, to: undefined })}
                              className="h-9 text-xs text-muted-foreground"
                            >
                              Limpar
                            </Button>
                          )}
                        </div>

                        <Button
                          onClick={downloadExtract}
                          className="h-9 bg-emerald-500 text-xs text-white hover:bg-emerald-600"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Baixar Extrato
                        </Button>
                      </div>

                      {/* Transactions List */}
                      <div>
                        <h3 className="mb-3 text-sm font-semibold text-foreground">Transações ({filteredTx.length})</h3>
                        {filteredTx.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredTx.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex flex-col gap-2 rounded-lg bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground">
                                      {formatCurrency(tx.gross_value)}
                                    </p>
                                    <span className="text-xs text-muted-foreground">→</span>
                                    <p className="text-sm font-medium text-emerald-500">
                                      {formatCurrency(tx.net_value)}
                                    </p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBrandName(tx.brand)} - {formatPaymentType(tx.payment_type, tx.installments)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap",
                                    tx.status === "verified" && "bg-emerald-500/20 text-emerald-500",
                                    tx.status === "pending_receipt" && "bg-amber-500/20 text-amber-500",
                                    tx.status === "pending_verification" && "bg-blue-500/20 text-blue-500",
                                    tx.status === "paid" && "bg-purple-500/20 text-purple-500",
                                    tx.status === "rejected" && "bg-rose-500/20 text-rose-500",
                                  )}
                                >
                                  {tx.status === "verified" && "Verificado"}
                                  {tx.status === "pending_receipt" && "Aguardando Comprovante"}
                                  {tx.status === "pending_verification" && "Aguardando Verificação"}
                                  {tx.status === "paid" && "Pago"}
                                  {tx.status === "rejected" && "Rejeitado"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-muted-foreground">
                              {dateRange.from || dateRange.to
                                ? "Nenhuma transação encontrada no período selecionado"
                                : "Nenhuma transação para este cliente"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Pending Transactions Summary */}
                      {pendingTx.length > 0 && (
                        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-amber-500">
                                {pendingTx.length} transação{pendingTx.length > 1 ? "ões" : ""} pendente
                                {pendingTx.length > 1 ? "s" : ""}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Aguardando {pendingTx.filter((t) => t.status === "pending_receipt").length} comprovante
                                {pendingTx.filter((t) => t.status === "pending_receipt").length !== 1 ? "s" : ""} e{" "}
                                {pendingTx.filter((t) => t.status === "pending_verification").length} verificação
                                {pendingTx.filter((t) => t.status === "pending_verification").length !== 1 ? "ões" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
