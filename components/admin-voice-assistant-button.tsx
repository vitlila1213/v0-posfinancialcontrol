"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"
import { processAdminVoiceCommand, type AdminVoiceCommand } from "@/app/actions/admin-voice-assistant"

interface AdminVoiceAssistantButtonProps {
  onCommand: (command: AdminVoiceCommand) => void
  onRecordingChange?: (isRecording: boolean) => void
}

export function AdminVoiceAssistantButton({ onCommand, onRecordingChange }: AdminVoiceAssistantButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    onRecordingChange?.(isRecording)
  }, [isRecording, onRecordingChange])

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
          console.log("[v0] Admin comando processado:", command)
          onCommand(command)
        } catch (error) {
          console.error("[v0] Erro ao processar comando admin:", error)
        } finally {
          setIsProcessing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("[v0] Erro ao iniciar gravação:", error)
      alert("Erro ao acessar o microfone. Verifique as permissões.")
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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isProcessing}
      className="h-8 w-8 p-0 transition-colors hover:bg-white/10"
      title={isRecording ? "Parar gravação" : "Comando de voz"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
      ) : isRecording ? (
        <Square className="h-4 w-4 animate-pulse text-rose-500" />
      ) : (
        <Mic className="h-4 w-4 text-muted-foreground hover:text-violet-400" />
      )}
    </Button>
  )
}
