"use client"

import { useState } from "react"
import { User, Phone, Mail, CreditCard, Building, Loader2 } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { GlassCard } from "@/components/glass-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function PerfilPage() {
  const { profile, updateProfile, isLoading } = useSupabase()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    pix_key: profile?.pix_key || "",
    bank_name: profile?.bank_name || "",
    bank_agency: profile?.bank_agency || "",
    bank_account: profile?.bank_account || "",
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(formData)
    } catch (error) {
      console.error("Erro ao salvar perfil:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e bancárias</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <User className="h-5 w-5 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Dados Pessoais</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome Completo</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="border-white/10 bg-white/5"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {profile?.email}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Telefone (WhatsApp)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="border-white/10 bg-white/5 pl-9"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
              <Building className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Dados Bancários</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Chave PIX</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  placeholder="CPF, Email, Telefone ou Chave Aleatória"
                  className="border-white/10 bg-white/5 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Banco</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Nome do banco"
                className="border-white/10 bg-white/5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Agência</Label>
                <Input
                  value={formData.bank_agency}
                  onChange={(e) => setFormData({ ...formData, bank_agency: e.target.value })}
                  placeholder="0000"
                  className="border-white/10 bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Conta</Label>
                <Input
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  placeholder="00000-0"
                  className="border-white/10 bg-white/5"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
      </div>
    </div>
  )
}
