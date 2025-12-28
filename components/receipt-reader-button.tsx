"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { readReceiptImage, type ReceiptData } from "@/app/actions/receipt-reader"
import { toast } from "@/hooks/use-toast"

interface ReceiptReaderButtonProps {
  onDataExtracted: (data: ReceiptData) => void
  disabled?: boolean
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string

      img.onload = () => {
        // Calcular novas dimensões mantendo aspect ratio
        const maxSize = 1024
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        // Criar canvas e comprimir
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Não foi possível criar contexto do canvas"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Converter para WebP com qualidade 0.7
        const compressedBase64 = canvas.toDataURL("image/webp", 0.7)
        resolve(compressedBase64)
      }

      img.onerror = () => reject(new Error("Erro ao carregar imagem"))
    }

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
  })
}

export function ReceiptReaderButton({ onDataExtracted, disabled }: ReceiptReaderButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      })
      return
    }

    setIsOptimizing(true)

    try {
      const compressedBase64 = await compressImage(file)

      setIsOptimizing(false)
      setIsProcessing(true)

      // Processar com GPT-4o Vision
      const extractedData = await readReceiptImage(compressedBase64)

      if (extractedData && extractedData.amount) {
        toast({
          title: "✓ Dados extraídos do comprovante!",
          description: `Valor: R$ ${extractedData.amount.toFixed(2)} | ${extractedData.payment_type === "credito" ? `${extractedData.installments}x` : "À vista"}`,
        })
        onDataExtracted(extractedData)
      } else {
        toast({
          title: "Erro ao ler comprovante",
          description: "Não foi possível extrair os dados. Tente outra imagem.",
          variant: "destructive",
        })
      }

      setIsProcessing(false)
    } catch (error) {
      console.error("[v0] Erro ao processar comprovante:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o comprovante",
        variant: "destructive",
      })
      setIsOptimizing(false)
      setIsProcessing(false)
    }

    // Limpar input para permitir selecionar a mesma imagem novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const isLoading = isOptimizing || isProcessing
  const loadingText = isOptimizing ? "Otimizando imagem..." : isProcessing ? "Lendo comprovante..." : ""

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isLoading}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9"
        onClick={handleClick}
        disabled={disabled || isLoading}
        title={loadingText || "Ler comprovante (câmera ou galeria)"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Camera className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
        )}
      </Button>
    </>
  )
}
