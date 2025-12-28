"use client"

import { useState, useMemo } from "react"
import { GlassCard } from "@/components/glass-card"
import type { Transaction } from "@/lib/types"
import { Calendar, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format, subDays, eachDayOfInterval, startOfToday } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AdminChartCardProps {
  transactions: Transaction[]
}

export function AdminChartCard({ transactions }: AdminChartCardProps) {
  const [dateRange, setDateRange] = useState<"today" | "7days" | "15days" | "30days" | "60days" | "90days" | "custom">(
    "30days",
  )
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const chartData = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (dateRange) {
      case "today":
        start = startOfToday()
        break
      case "7days":
        start = subDays(now, 7)
        break
      case "15days":
        start = subDays(now, 15)
        break
      case "30days":
        start = subDays(now, 30)
        break
      case "60days":
        start = subDays(now, 60)
        break
      case "90days":
        start = subDays(now, 90)
        break
      case "custom":
        if (!customStartDate || !customEndDate) {
          start = subDays(now, 30)
        } else {
          start = new Date(customStartDate)
          end = new Date(customEndDate)
        }
        break
      default:
        start = subDays(now, 30)
    }

    const days = eachDayOfInterval({ start, end })

    return days.map((day) => {
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      // Filter transactions up to this day
      const transactionsUpToDay = transactions.filter((t) => {
        if (t.is_chargeback) return false
        const txDate = new Date(t.created_at)
        return txDate <= dayEnd
      })

      // Calculate cumulative totals
      const totalVolume = transactionsUpToDay
        .filter((t) => t.status !== "rejected")
        .reduce((sum, t) => sum + t.gross_value, 0)

      const totalFees = transactionsUpToDay
        .filter((t) => t.status !== "rejected")
        .reduce((sum, t) => sum + t.fee_value, 0)

      return {
        date: format(day, "dd/MMM", { locale: ptBR }),
        fullDate: format(day, "dd/MM/yyyy"),
        volume: Number(totalVolume.toFixed(2)),
        fees: Number(totalFees.toFixed(2)),
      }
    })
  }, [transactions, dateRange, customStartDate, customEndDate])

  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Evolução de Receita</h3>
            <p className="text-sm text-muted-foreground">Volume e taxas por período</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-lg border border-white/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm transition-colors hover:bg-background/90 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={{ colorScheme: "dark" }}
          >
            <option value="today" className="bg-background text-foreground">
              Hoje
            </option>
            <option value="7days" className="bg-background text-foreground">
              Últimos 7 dias
            </option>
            <option value="15days" className="bg-background text-foreground">
              Últimos 15 dias
            </option>
            <option value="30days" className="bg-background text-foreground">
              Últimos 30 dias
            </option>
            <option value="60days" className="bg-background text-foreground">
              Últimos 60 dias
            </option>
            <option value="90days" className="bg-background text-foreground">
              Últimos 90 dias
            </option>
            <option value="custom" className="bg-background text-foreground">
              Período customizado
            </option>
          </select>
        </div>
      </div>

      {dateRange === "custom" && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">De:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-white/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Até:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-white/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>
      )}

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }}
              tickFormatter={(value) =>
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 15, 20, 0.95)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "12px",
                padding: "12px",
              }}
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
                name === "volume" ? "Volume Total" : "Total em Taxas",
              ]}
            />
            <Legend
              formatter={(value) => (value === "volume" ? "Volume Total" : "Total em Taxas")}
              wrapperStyle={{ paddingTop: "20px" }}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="fees"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Volume Inicial</p>
            <p className="text-sm font-semibold text-blue-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(chartData[0]?.volume || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volume Final</p>
            <p className="text-sm font-semibold text-blue-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                chartData[chartData.length - 1]?.volume || 0,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxas Acumuladas</p>
            <p className="text-sm font-semibold text-amber-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                chartData[chartData.length - 1]?.fees || 0,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Crescimento</p>
            <p
              className={`text-sm font-semibold ${
                (chartData[chartData.length - 1]?.volume || 0) - (chartData[0]?.volume || 0) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                signDisplay: "always",
              }).format((chartData[chartData.length - 1]?.volume || 0) - (chartData[0]?.volume || 0))}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
