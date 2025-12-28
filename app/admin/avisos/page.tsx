"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Trash2, Eye, EyeOff, Calendar } from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { createClient } from "@/lib/supabase/client"
import type { Announcement } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function AvisosPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const supabase = createClient()

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching announcements:", error)
      return
    }

    setAnnouncements(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Preencha todos os campos")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("Erro ao obter usuário")
      return
    }

    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      message: message.trim(),
      is_active: true,
      created_by: user.id,
    })

    if (error) {
      console.error("[v0] Error creating announcement:", error)
      alert("Erro ao criar aviso")
      return
    }

    setTitle("")
    setMessage("")
    setShowModal(false)
    fetchAnnouncements()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("[v0] Error toggling announcement:", error)
      alert("Erro ao atualizar aviso")
      return
    }

    fetchAnnouncements()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este aviso?")) return

    const { error } = await supabase.from("announcements").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting announcement:", error)
      alert("Erro ao excluir aviso")
      return
    }

    fetchAnnouncements()
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avisos</h1>
          <p className="text-sm text-muted-foreground">Gerencie avisos para os clientes</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo Aviso
        </motion.button>
      </div>

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum aviso cadastrado ainda.</p>
          </GlassCard>
        ) : (
          announcements.map((announcement) => (
            <GlassCard key={announcement.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                    {announcement.is_active ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-500">
                        Ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">{announcement.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(announcement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    title={announcement.is_active ? "Desativar" : "Ativar"}
                  >
                    {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-500/10"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6"
          >
            <h2 className="mb-4 text-xl font-bold text-foreground">Novo Aviso</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-foreground placeholder-muted-foreground focus:border-pink-500 focus:outline-none"
                  placeholder="Ex: Manutenção Programada"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Mensagem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-foreground placeholder-muted-foreground focus:border-pink-500 focus:outline-none"
                  placeholder="Digite a mensagem do aviso..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                Criar Aviso
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
