"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/glass-card"
import { createClient } from "@/lib/supabase/client"
import { useSupabase } from "@/lib/supabase-context"
import { Plus, Copy, Check, Loader2, Key } from "lucide-react"
import type { AccessCode } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function CodigosPage() {
  const { profile, clients } = useSupabase()
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [quantityToGenerate, setQuantityToGenerate] = useState(1)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    console.log("[v0] Códigos page mounted, profile:", profile?.role)
  }, [])

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchAccessCodes()
    }
  }, [profile])

  const fetchAccessCodes = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from("access_codes").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao carregar códigos:", error)
    } else {
      setAccessCodes(data || [])
    }
    setIsLoading(false)
  }

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleGenerateCodes = async () => {
    if (!profile) return
    setIsGenerating(true)

    try {
      const newCodes = []
      for (let i = 0; i < quantityToGenerate; i++) {
        newCodes.push({
          code: generateCode(),
          created_by: profile.id,
        })
      }

      const { error } = await supabase.from("access_codes").insert(newCodes)

      if (error) throw error

      await fetchAccessCodes()
      setQuantityToGenerate(1)
    } catch (error) {
      console.error("Erro ao gerar códigos:", error)
      alert("Erro ao gerar códigos de acesso")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getClientName = (userId: string | null) => {
    if (!userId) return "-"
    const client = clients.find((c) => c.id === userId)
    return client?.full_name || client?.email || "Cliente"
  }

  if (profile?.role !== "admin") {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Acesso negado</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const unusedCodes = accessCodes.filter((c) => !c.is_used)
  const usedCodes = accessCodes.filter((c) => c.is_used)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Códigos de Acesso</h1>
        <p className="text-sm text-muted-foreground">Gere e gerencie códigos de convite para novos clientes</p>
      </div>

      {/* Generator Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="quantity" className="text-muted-foreground">
              Quantidade de Códigos
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="50"
              value={quantityToGenerate}
              onChange={(e) => setQuantityToGenerate(Math.max(1, Math.min(50, Number.parseInt(e.target.value) || 1)))}
              className="border-white/10 bg-secondary text-foreground"
            />
          </div>
          <Button onClick={handleGenerateCodes} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Gerar Códigos
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-secondary/50 p-4">
            <p className="text-sm text-muted-foreground">Total de Códigos</p>
            <p className="text-2xl font-bold text-foreground">{accessCodes.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-400">Códigos Disponíveis</p>
            <p className="text-2xl font-bold text-emerald-500">{unusedCodes.length}</p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-400">Códigos Utilizados</p>
            <p className="text-2xl font-bold text-blue-500">{usedCodes.length}</p>
          </div>
        </div>
      </GlassCard>

      {/* Unused Codes */}
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-foreground">Códigos Disponíveis</h2>
        </div>

        {unusedCodes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum código disponível</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unusedCodes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-secondary/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded bg-emerald-500/20 px-2 py-1">
                    <span className="font-mono text-sm font-bold text-emerald-400">{code.code}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(code.code)} className="h-8 w-8 p-0">
                  {copiedCode === code.code ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Used Codes */}
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-foreground">Códigos Utilizados</h2>
        </div>

        {usedCodes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum código utilizado ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Código</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Usado Por</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Data de Uso</th>
                </tr>
              </thead>
              <tbody>
                {usedCodes.map((code) => (
                  <tr key={code.id} className="border-b border-white/5">
                    <td className="py-3">
                      <span className="font-mono text-sm font-bold text-blue-400">{code.code}</span>
                    </td>
                    <td className="py-3 text-sm text-foreground">{getClientName(code.used_by)}</td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {code.used_at ? format(new Date(code.used_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
