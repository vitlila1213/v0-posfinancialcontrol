"use client"

import { Wallet, Clock, CheckCircle, FileText } from "lucide-react"
import { formatCurrency } from "@/lib/pos-rates"
import { useSupabase } from "@/lib/supabase-context"

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "bg-amber-500/20 text-amber-500", icon: Clock },
  paid: { label: "Pago", color: "bg-emerald-500/20 text-emerald-500", icon: CheckCircle },
}

interface WithdrawalsTableClientProps {
  methodFilter?: string
  statusFilter?: string
}

export function WithdrawalsTableClient({ methodFilter = "all", statusFilter = "all" }: WithdrawalsTableClientProps) {
  const { user, withdrawals } = useSupabase()

  const userWithdrawals = withdrawals
    .filter((w) => w.user_id === user?.id)
    .filter((w) => methodFilter === "all" || w.method === methodFilter)
    .filter((w) => statusFilter === "all" || w.status === statusFilter)

  if (userWithdrawals.length === 0) {
    return (
      <div className="py-12 text-center">
        <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Nenhum saque solicitado</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {userWithdrawals.map((withdrawal) => {
        const status = statusConfig[withdrawal.status] || statusConfig.pending
        const StatusIcon = status.icon

        return (
          <div
            key={withdrawal.id}
            className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  withdrawal.status === "paid" ? "bg-emerald-500/20" : "bg-amber-500/20"
                }`}
              >
                <StatusIcon
                  className={`h-5 w-5 ${withdrawal.status === "paid" ? "text-emerald-500" : "text-amber-500"}`}
                />
              </div>
              <div>
                <p className="font-medium text-foreground">{formatCurrency(withdrawal.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  Solicitado em {new Date(withdrawal.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>{status.label}</span>

              {withdrawal.status === "paid" && withdrawal.admin_proof_url && (
                <a
                  href={withdrawal.admin_proof_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <FileText className="h-3 w-3" />
                  Ver Comprovante
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
