"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { formatCurrency } from "@/lib/pos-rates"
import { formatBrandName } from "@/lib/utils"
import type { Transaction } from "@/lib/types"

const brandColors: Record<string, string> = {
  visa_master: "#3b82f6",
  elo_amex: "#f97316",
  pix: "#10b981",
}

interface ChartProps {
  transactions: Transaction[]
}

export function SalesByBrandChart({ transactions }: ChartProps) {
  const salesByBrand = transactions
    .filter((t) => t.status !== "rejected")
    .reduce(
      (acc, t) => {
        const brandName = formatBrandName(t.brand)
        const existing = acc.find((item) => item.brand === brandName)
        if (existing) {
          existing.amount += t.gross_value
        } else {
          acc.push({ brand: brandName, amount: t.gross_value, key: t.brand })
        }
        return acc
      },
      [] as { brand: string; amount: number; key: string }[],
    )

  if (salesByBrand.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground sm:h-[250px]">
        Nenhuma transação registrada
      </div>
    )
  }

  return (
    <div className="h-[200px] sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={salesByBrand} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="brand"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(value: number) => [formatCurrency(value), "Volume"]}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {salesByBrand.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={brandColors[entry.key] || "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FeesCostChart({ transactions }: ChartProps) {
  const feesByMonth = transactions
    .filter((t) => t.status !== "rejected")
    .reduce(
      (acc, t) => {
        const date = new Date(t.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthName = date.toLocaleDateString("pt-BR", { month: "short" })

        const existing = acc.find((item) => item.key === monthKey)
        if (existing) {
          existing.fees += t.fee_value
        } else {
          acc.push({ key: monthKey, month: monthName, fees: t.fee_value })
        }
        return acc
      },
      [] as { key: string; month: string; fees: number }[],
    )
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6)

  if (feesByMonth.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground sm:h-[250px]">
        Nenhuma taxa registrada
      </div>
    )
  }

  return (
    <div className="h-[200px] sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={feesByMonth}>
          <defs>
            <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(value: number) => [formatCurrency(value), "Taxas"]}
          />
          <Area type="monotone" dataKey="fees" stroke="#f43f5e" strokeWidth={2} fill="url(#feeGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
