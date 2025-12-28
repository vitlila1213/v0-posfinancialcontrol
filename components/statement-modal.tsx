"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, Calendar, FileText } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { formatCurrency } from "@/lib/pos-rates"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface StatementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type QuickFilter = "today" | "7days" | "15days" | "30days" | "60days" | "90days"

export function StatementModal({ open, onOpenChange }: StatementModalProps) {
  const { user, transactions, profile } = useSupabase()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter | null>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      // Define datas padrão: último mês
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      setEndDate(end.toISOString().split("T")[0])
      setStartDate(start.toISOString().split("T")[0])
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  const applyQuickFilter = (filter: QuickFilter) => {
    const end = new Date()
    const start = new Date()

    switch (filter) {
      case "today":
        start.setHours(0, 0, 0, 0)
        break
      case "7days":
        start.setDate(start.getDate() - 7)
        break
      case "15days":
        start.setDate(start.getDate() - 15)
        break
      case "30days":
        start.setDate(start.getDate() - 30)
        break
      case "60days":
        start.setDate(start.getDate() - 60)
        break
      case "90days":
        start.setDate(start.getDate() - 90)
        break
    }

    setStartDate(start.toISOString().split("T")[0])
    setEndDate(end.toISOString().split("T")[0])
    setSelectedFilter(filter)
  }

  if (!open || !user) return null

  const userTransactions = transactions.filter((t) => {
    if (t.user_id !== user.id) return false
    const txDate = new Date(t.created_at)
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    return txDate >= start && txDate <= end
  })

  const generatePDF = () => {
    setIsGenerating(true)

    try {
      const doc = new jsPDF()

      // Header
      doc.setFontSize(18)
      doc.setTextColor(16, 185, 129) // emerald-500
      doc.text("Extrato de Transações", 14, 20)

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Cliente: ${profile?.full_name || profile?.email || ""}`, 14, 28)
      doc.text(
        `Período: ${new Date(startDate).toLocaleDateString("pt-BR")} até ${new Date(endDate).toLocaleDateString("pt-BR")}`,
        14,
        34,
      )
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 40)

      // Summary
      const totalGross = userTransactions.reduce((sum, t) => sum + t.gross_value, 0)
      const totalNet = userTransactions.reduce((sum, t) => sum + t.net_value, 0)
      const totalFee = userTransactions.reduce((sum, t) => sum + t.fee_value, 0)

      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.text("Resumo do Período:", 14, 50)
      doc.setFontSize(9)
      doc.text(`Total de Transações: ${userTransactions.length}`, 14, 56)
      doc.text(`Valor Bruto Total: ${formatCurrency(totalGross)}`, 14, 62)
      doc.text(`Total de Taxas: ${formatCurrency(totalFee)}`, 14, 68)
      doc.text(`Valor Líquido Total: ${formatCurrency(totalNet)}`, 14, 74)

      // Table
      const tableData = userTransactions.map((tx) => [
        new Date(tx.created_at).toLocaleDateString("pt-BR"),
        tx.brand === "visa_master" ? "Visa/Master" : "Elo/Amex",
        tx.payment_type === "debit" ? "Débito" : `Crédito ${tx.installments}x`,
        formatCurrency(tx.gross_value),
        `${tx.fee_percentage.toFixed(2)}%`,
        formatCurrency(tx.fee_value),
        formatCurrency(tx.net_value),
        tx.status === "verified"
          ? "Verificado"
          : tx.status === "pending_verification"
            ? "Em Verificação"
            : tx.status === "pending_receipt"
              ? "Aguard. Comprovante"
              : tx.status === "rejected"
                ? "Rejeitado"
                : tx.status === "paid"
                  ? "Pago"
                  : "Estornado",
      ])

      autoTable(doc, {
        startY: 82,
        head: [["Data", "Bandeira", "Tipo", "Valor Bruto", "Taxa %", "Taxa R$", "Valor Líquido", "Status"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 22 },
          2: { cellWidth: 25 },
          3: { cellWidth: 24 },
          4: { cellWidth: 16 },
          5: { cellWidth: 20 },
          6: { cellWidth: 24 },
          7: { cellWidth: 25 },
        },
      })

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          {
            align: "center",
          },
        )
      }

      doc.save(`extrato-${startDate}-${endDate}.pdf`)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

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
          className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl pointer-events-auto"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Extrato de Transações</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm text-muted-foreground">Filtros Rápidos:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyQuickFilter("today")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === "today"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => applyQuickFilter("7days")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === "7days"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                7 dias
              </button>
              <button
                onClick={() => applyQuickFilter("15days")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === "15days"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                15 dias
              </button>
              <button
                onClick={() => applyQuickFilter("30days")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === "30days"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                30 dias
              </button>
              <button
                onClick={() => applyQuickFilter("60days")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === "60days"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                60 dias
              </button>
              <button
                onClick={() => applyQuickFilter("90days")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === "90days"
                    ? "bg-emerald-600 text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                90 dias
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="start-date" className="text-sm text-muted-foreground">
                Data Início
              </Label>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setSelectedFilter(null)
                  }}
                  className="border-white/10 bg-white/5 pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="end-date" className="text-sm text-muted-foreground">
                Data Fim
              </Label>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setSelectedFilter(null)
                  }}
                  className="border-white/10 bg-white/5 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Resumo do Período Selecionado:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Total de Transações</p>
                <p className="text-lg font-bold text-emerald-500">{userTransactions.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Bruto Total</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(userTransactions.reduce((sum, t) => sum + t.gross_value, 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Taxas</p>
                <p className="text-lg font-bold text-rose-500">
                  {formatCurrency(userTransactions.reduce((sum, t) => sum + t.fee_value, 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Líquido Total</p>
                <p className="text-lg font-bold text-emerald-500">
                  {formatCurrency(userTransactions.reduce((sum, t) => sum + t.net_value, 0))}
                </p>
              </div>
            </div>
          </div>

          {userTransactions.length > 0 ? (
            <div className="mb-6 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-white/5 p-4">
              {userTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatCurrency(tx.gross_value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("pt-BR")} -{" "}
                      {tx.brand === "visa_master" ? "Visa/Master" : "Elo/Amex"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-500">{formatCurrency(tx.net_value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.status === "verified"
                        ? "Verificado"
                        : tx.status === "pending_verification"
                          ? "Em Verificação"
                          : tx.status === "pending_receipt"
                            ? "Aguard. Comprovante"
                            : tx.status === "rejected"
                              ? "Rejeitado"
                              : tx.status === "paid"
                                ? "Pago"
                                : "Estornado"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 rounded-xl bg-white/5 p-8 text-center">
              <FileText className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma transação encontrada neste período</p>
            </div>
          )}

          <Button
            onClick={generatePDF}
            disabled={isGenerating || userTransactions.length === 0}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Gerando PDF..." : "Baixar Extrato (PDF)"}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
