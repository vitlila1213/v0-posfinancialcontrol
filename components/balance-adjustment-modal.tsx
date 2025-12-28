"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, AlertCircle, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSupabase } from "@/lib/supabase-context"
import type { Profile, AdjustmentType } from "@/lib/types"
import { toast } from "sonner"
import { processBalanceAdjustmentVoice } from "@/app/actions/balance-adjustment-voice"

interface BalanceAdjustmentModalProps {
  client: Profile | null
  onClose: () => void
}

export function BalanceAdjustmentModal({ client, onClose }: BalanceAdjustmentModalProps) {
  const { addBalanceAdjustment } = useSupabase()
  const [type, setType] = useState<AdjustmentType>("add")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (client) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [client])

  if (!client) return null

  const toggleRecording = async () => {
    if (isRecording) {
      // Parar gravação
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      // Iniciar gravação
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          stream.getTracks().forEach((track) => track.stop())

          // Processar o áudio com IA
          setIsProcessingVoice(true)
          try {
            const result = await processBalanceAdjustmentVoice(audioBlob)

            if (result) {
              setType(result.type)
              setAmount(result.amount.toString())
              setReason(result.reason)
              toast.success("Comando de voz processado com sucesso!")
            } else {
              toast.error("Não foi possível processar o comando de voz")
            }
          } catch (error) {
            console.error("Erro ao processar voz:", error)
            toast.error("Erro ao processar comando de voz")
          } finally {
            setIsProcessingVoice(false)
          }
        }

        mediaRecorder.start()
        setIsRecording(true)
        toast.info("Gravando... Clique novamente para parar")
      } catch (error) {
        console.error("Erro ao acessar microfone:", error)
        toast.error("Erro ao acessar microfone")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountValue = Number.parseFloat(amount)
    if (!amountValue || amountValue <= 0) {
      toast.error("Valor inválido")
      return
    }

    if (!reason.trim()) {
      toast.error("Informe o motivo do ajuste")
      return
    }

    setIsSubmitting(true)

    try {
      await addBalanceAdjustment(client.id, type, amountValue, reason)
      toast.success(`Saldo ${type === "add" ? "adicionado" : "removido"} com sucesso`)
      onClose()
    } catch (error) {
      console.error("Erro ao ajustar saldo:", error)
      toast.error("Erro ao ajustar saldo")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
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
            <h2 className="text-xl font-bold text-foreground">Ajustar Saldo</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isProcessingVoice}
                className={`rounded-lg p-2 transition-all ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : isProcessingVoice
                      ? "bg-white/10 text-muted-foreground cursor-wait"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
                title={isRecording ? "Parar gravação" : "Comando de voz"}
              >
                {isProcessingVoice ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-white/5 p-3">
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-medium text-foreground">{client.full_name || client.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Tipo de Ajuste</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("add")}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
                    type === "add"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Adicionar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("remove")}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
                    type === "remove"
                      ? "border-rose-500 bg-rose-500/20 text-rose-500"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <Minus className="h-4 w-4" />
                  <span className="text-sm font-medium">Remover</span>
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="amount" className="text-sm text-muted-foreground">
                Valor (R$)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="mt-2 border-white/10 bg-white/5"
                required
              />
            </div>

            <div>
              <Label htmlFor="reason" className="text-sm text-muted-foreground">
                Motivo do Ajuste
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Correção de erro, bônus especial, etc."
                className="mt-2 min-h-[80px] border-white/10 bg-white/5"
                required
              />
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-500">
                  Este ajuste será {type === "add" ? "adicionado ao" : "removido do"} saldo disponível do cliente
                  imediatamente.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 bg-white/5">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 text-white ${
                  type === "add" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                {isSubmitting ? "Salvando..." : type === "add" ? "Adicionar Saldo" : "Remover Saldo"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
