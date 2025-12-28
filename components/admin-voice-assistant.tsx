"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"
import { processAdminVoiceCommand, type AdminVoiceCommand } from "@/app/actions/admin-voice-assistant"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export function AdminVoiceAssistant() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleCommand = (command: AdminVoiceCommand) => {
    console.log("[v0] Admin Voice Command:", command)

    if (command.intent === "unknown") {
      toast({
        title: "Comando não reconhecido",
        description: "Não consegui entender o comando. Tente novamente.",
        variant: "destructive",
      })
      return
    }

    // Navegação
    if (command.intent === "navigate" && command.data?.page) {
      const pageMap = {
        dashboard: "/admin",
        clientes: "/admin/clientes",
        pagamentos: "/admin/pagamentos",
        comprovantes: "/admin/comprovantes",
      }
      router.push(pageMap[command.data.page])
      toast({
        title: "Navegando",
        description: `Abrindo página de ${command.data.page}`,
      })
      return
    }

    // Buscar cliente
    if (command.intent === "search_client" && command.data?.clientName) {
      // Emitir evento customizado para buscar cliente
      window.dispatchEvent(
        new CustomEvent("admin-voice-search", {
          detail: { clientName: command.data.clientName },
        }),
      )
      toast({
        title: "Buscando cliente",
        description: `Procurando por ${command.data.clientName}`,
      })
      return
    }

    // Aprovar/Rejeitar
    if (["approve_payment", "reject_payment", "approve_receipt", "reject_receipt"].includes(command.intent)) {
      window.dispatchEvent(
        new CustomEvent("admin-voice-action", {
          detail: { action: command.intent },
        }),
      )
      toast({
        title: "Executando ação",
        description: "Processando seu comando...",
      })
      return
    }

    // Atribuir plano
    if (command.intent === "assign_plan" && command.data?.clientName && command.data?.planName) {
      window.dispatchEvent(
        new CustomEvent("admin-voice-assign-plan", {
          detail: {
            clientName: command.data.clientName,
            planName: command.data.planName,
          },
        }),
      )
      toast({
        title: "Atribuindo plano",
        description: `Atribuindo plano ${command.data.planName} para ${command.data.clientName}`,
      })
      return
    }

    // Ajustar saldo
    if (
      command.intent === "adjust_balance" &&
      command.data?.clientName &&
      command.data?.amount &&
      command.data?.action
    ) {
      window.dispatchEvent(
        new CustomEvent("admin-voice-adjust-balance", {
          detail: {
            clientName: command.data.clientName,
            amount: command.data.amount,
            action: command.data.action,
          },
        }),
      )
      toast({
        title: "Ajustando saldo",
        description: `${command.data.action === "add" ? "Adicionando" : "Removendo"} R$ ${command.data.amount.toFixed(2)} ${command.data.action === "add" ? "para" : "de"} ${command.data.clientName}`,
      })
      return
    }

    // Filtrar dados
    if (command.intent === "filter_data") {
      window.dispatchEvent(
        new CustomEvent("admin-voice-filter", {
          detail: command.data,
        }),
      )
      toast({
        title: "Aplicando filtros",
        description: "Filtrando dados...",
      })
      return
    }

    toast({
      title: "Comando recebido",
      description: "Processando sua solicitação...",
    })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())

        setIsProcessing(true)

        try {
          const command = await processAdminVoiceCommand(audioBlob)
          handleCommand(command)
        } catch (error) {
          console.error("[v0] Erro ao processar comando:", error)
          toast({
            title: "Erro",
            description: "Não foi possível processar o comando de voz.",
            variant: "destructive",
          })
        } finally {
          setIsProcessing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("[v0] Erro ao iniciar gravação:", error)
      toast({
        title: "Erro de Microfone",
        description: "Verifique as permissões do microfone.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleClick = () => {
    if (isProcessing) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording && <span className="text-xs text-rose-400 animate-pulse">Ouvindo...</span>}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isProcessing}
        className="h-9 w-9 p-0 transition-all hover:bg-white/10"
        title={isRecording ? "Parar gravação" : "Iniciar comando de voz"}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        ) : isRecording ? (
          <Square className="h-5 w-5 animate-pulse fill-rose-500 text-rose-500" />
        ) : (
          <Mic className="h-5 w-5 text-muted-foreground hover:text-violet-400 transition-colors" />
        )}
      </Button>
    </div>
  )
}
