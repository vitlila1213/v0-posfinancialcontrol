"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, User, Mail, Phone, CreditCard, Calendar, DollarSign, Download, Trash2, Search } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { TransactionsTableClient } from "@/components/transactions-table-client"
import { WithdrawalsTableClient } from "@/components/withdrawals-table-client"
import { toast } from "sonner"

export default async function ClientPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <ClientPanelContent clientId={id} />
}

function ClientPanelContent({ clientId }: { clientId: string }) {
  const router = useRouter()
  const { clients, transactions, withdrawals, supabase } = useSupabase()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<string>("all")

  useEffect(() => {
    const foundClient = clients.find((c) => c.id === clientId)
    setClient(foundClient || null)
    setLoading(false)
  }, [clients, clientId])

  const handleDeleteClient = async () => {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${client?.full_name}? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", clientId)

      if (error) throw error

      toast.success("Cliente excluído com sucesso")
      router.push("/admin/clientes")
    } catch (error: any) {
      console.error("Erro ao excluir cliente:", error)
      toast.error(`Erro ao excluir cliente: ${error.message}`)
    }
  }

  const handleExportReport = () => {
    const clientTransactions = transactions.filter((t) => t.user_id === client.id)
    const clientWithdrawals = withdrawals.filter((w) => w.user_id === client.id)

    const csvContent = [
      ["RELATÓRIO DO CLIENTE - " + client.full_name],
      ["Data de Geração:", new Date().toLocaleString("pt-BR")],
      [""],
      ["RESUMO"],
      ["Saldo Disponível:", formatCurrency(Number(client.balance || 0))],
      [
        "Total Sacado:",
        formatCurrency(
          clientWithdrawals.filter((w) => w.status === "paid").reduce((sum, w) => sum + Number(w.amount), 0),
        ),
      ],
      ["Total Faturado:", formatCurrency(clientTransactions.reduce((sum, t) => sum + Number(t.gross_value), 0))],
      [""],
      ["TRANSAÇÕES"],
      ["Data", "Valor Bruto", "Taxa", "Valor Líquido", "Bandeira", "Parcelas", "Status"],
      ...clientTransactions.map((t) => [
        new Date(t.created_at).toLocaleDateString("pt-BR"),
        formatCurrency(Number(t.gross_value)),
        formatCurrency(Number(t.fee_amount)),
        formatCurrency(Number(t.net_value)),
        t.card_brand,
        t.installments,
        t.status,
      ]),
      [""],
      ["SAQUES"],
      ["Data", "Valor", "Método", "Status", "Chave PIX"],
      ...clientWithdrawals.map((w) => [
        new Date(w.created_at).toLocaleDateString("pt-BR"),
        formatCurrency(Number(w.amount)),
        w.method,
        w.status,
        w.pix_key || "-",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `relatorio-${client.full_name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    link.click()

    toast.success("Relatório exportado com sucesso")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Cliente não encontrado</h2>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </GlassCard>
      </div>
    )
  }

  const clientTransactions = transactions.filter((t) => t.user_id === client.id)
  const clientWithdrawals = withdrawals.filter((w) => w.user_id === client.id)

  const filteredTransactions = clientTransactions.filter((transaction) => {
    const matchesSearch =
      searchTerm === "" ||
      transaction.card_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.payment_type?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter

    const matchesCard =
      cardFilter === "all" ||
      (cardFilter === "visa-master" && ["visa", "mastercard"].includes(transaction.card_brand?.toLowerCase() || "")) ||
      (cardFilter === "elo-amex" && ["elo", "amex"].includes(transaction.card_brand?.toLowerCase() || ""))

    return matchesSearch && matchesStatus && matchesCard
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Painel do Cliente</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Relatório
          </Button>
          <Button variant="destructive" onClick={handleDeleteClient}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Cliente
          </Button>
        </div>
      </div>

      {/* Client Info Card */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold mb-4">Informações do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Nome</div>
              <div className="font-semibold">{client.full_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-semibold">{client.email}</div>
            </div>
          </div>
          {client.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Telefone</div>
                <div className="font-semibold">{client.phone}</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Plano</div>
              <div className="font-semibold capitalize">{client.plan || "Sem plano"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Cadastrado em</div>
              <div className="font-semibold">{new Date(client.created_at).toLocaleDateString("pt-BR")}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Saldo Disponível</div>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500">{formatCurrency(Number(client.balance || 0))}</div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Total Sacado</div>
            <DollarSign className="h-5 w-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500">
            {formatCurrency(
              clientWithdrawals.filter((w) => w.status === "paid").reduce((sum, w) => sum + Number(w.amount), 0),
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Total Faturado</div>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-500">
            {formatCurrency(clientTransactions.reduce((sum, t) => sum + Number(t.gross_value), 0))}
          </div>
        </GlassCard>
      </div>

      {/* Transactions */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Transações ({filteredTransactions.length})</h2>
        </div>

        <div className="mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por bandeira ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="text-sm text-muted-foreground mr-2">Status:</div>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "pending_verification" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending_verification")}
            >
              Pendente
            </Button>
            <Button
              variant={statusFilter === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("verified")}
            >
              Aprovado
            </Button>
            <Button
              variant={statusFilter === "rejected" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("rejected")}
            >
              Rejeitado
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="text-sm text-muted-foreground mr-2">Bandeira:</div>
            <Button
              variant={cardFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardFilter("all")}
            >
              Todas
            </Button>
            <Button
              variant={cardFilter === "visa-master" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardFilter("visa-master")}
            >
              Visa/Master
            </Button>
            <Button
              variant={cardFilter === "elo-amex" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardFilter("elo-amex")}
            >
              Elo/Amex
            </Button>
          </div>
        </div>

        <TransactionsTableClient transactions={filteredTransactions} />
      </GlassCard>

      {/* Withdrawals */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold mb-4">Saques ({clientWithdrawals.length})</h2>
        <WithdrawalsTableClient withdrawals={clientWithdrawals} />
      </GlassCard>
    </div>
  )
}
