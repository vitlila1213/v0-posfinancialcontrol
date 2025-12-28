"use client"

import { useState, useMemo } from "react"
import { GlassCard } from "@/components/glass-card"
import { useSupabase } from "@/lib/supabase-context"
import { Calendar, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { ptBR } from "date-fns/locale"

export function BalanceChartCard() {
  const { user, transactions } = useSupabase()
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days" | "custom">("30days")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const chartData = useMemo(() => {
    if (!user) return []

    const now = new Date()
    let start: Date
    let end: Date = now

    switch (dateRange) {
      case "7days":
        start = subDays(now, 7)
        break
      case "30days":
        start = subDays(now, 30)
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

    // Get all days in range
    const days = eachDayOfInterval({ start, end })

    return days.map((day) => {
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const dailySales = transactions.filter((t) => {
        if (t.user_id !== user.id) return false
        if (t.is_chargeback) return false
        if (t.status === "rejected") return false
        const txDate = new Date(t.created_at)
        return txDate >= dayStart && txDate <= dayEnd
      })

      const dailySalesAmount = dailySales.reduce((sum, t) => sum + t.gross_value, 0)
      const dailyNetAmount = dailySales.reduce((sum, t) => sum + t.net_value, 0)

      return {
        date: format(day, "dd/MMM", { locale: ptBR }),
        fullDate: format(day, "dd/MM/yyyy"),
        sales: Number(dailySalesAmount.toFixed(2)),
        net: Number(dailyNetAmount.toFixed(2)),
      }
    })
  }, [user, transactions, dateRange, customStartDate, customEndDate])

  if (!user) return null

  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Evolução de Vendas</h3>
            <p className="text-sm text-muted-foreground">Acompanhe suas vendas por período</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-lg border border-white/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm transition-colors hover:bg-background/90 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={{
              colorScheme: "dark",
            }}
          >
            <option value="7days" className="bg-background text-foreground">
              Últimos 7 dias
            </option>
            <option value="30days" className="bg-background text-foreground">
              Últimos 30 dias
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
              className="rounded-lg border border-white/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm transition-colors hover:bg-background/90 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={{
                colorScheme: "dark",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Até:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-white/20 bg-background/80 px-3 py-2 text-sm text-foreground backdrop-blur-sm transition-colors hover:bg-background/90 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={{
                colorScheme: "dark",
              }}
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
              tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }}
              tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
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
                color: "#fff",
                padding: "12px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              }}
              labelStyle={{ color: "#e5e7eb", marginBottom: "8px", fontWeight: 600 }}
              itemStyle={{ color: "#fff", padding: "4px 0" }}
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value),
                name === "sales" ? "Vendas Brutas" : "Valor Líquido",
              ]}
              labelFormatter={(label) => {
                const dataPoint = chartData.find((d) => d.date === label)
                return dataPoint ? dataPoint.fullDate : label
              }}
            />
            <Legend
              wrapperStyle={{ color: "rgba(255,255,255,0.8)", paddingTop: "20px" }}
              iconType="line"
              formatter={(value) => {
                if (value === "sales") return "Vendas Brutas"
                if (value === "net") return "Valor Líquido"
                return value
              }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              name="sales"
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              name="net"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Maior Venda do Dia</p>
            <p className="text-sm font-semibold text-blue-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Math.max(...chartData.map((d) => d.sales), 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Menor Venda do Dia</p>
            <p className="text-sm font-semibold text-blue-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(
                chartData.filter((d) => d.sales > 0).length > 0
                  ? Math.min(...chartData.filter((d) => d.sales > 0).map((d) => d.sales), 0)
                  : 0,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Vendido</p>
            <p className="text-sm font-semibold text-blue-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(chartData.reduce((sum, d) => sum + d.sales, 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Líquido</p>
            <p className="text-sm font-semibold text-emerald-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(chartData.reduce((sum, d) => sum + d.net, 0))}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
