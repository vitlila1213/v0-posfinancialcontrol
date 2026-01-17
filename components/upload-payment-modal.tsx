"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, Loader2 } from "lucide-react"
import { useSupabase } from "@/lib/supabase-context"
import { toast } from "sonner"

interface UploadPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  withdrawal: any
  onSuccess: () => void
}

export function UploadPaymentModal({ open, onOpenChange, withdrawal, onSuccess }: UploadPaymentModalProps) {
  const { supabase } = useSupabase()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    console.log("[v0] File selected:", selectedFile.name, selectedFile.type)

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"]
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Tipo de arquivo inválido. Use JPG, PNG, WEBP ou PDF")
      return
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB")
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    console.log("[v0] handleUpload called", { file, withdrawal })

    if (!file || !withdrawal) {
      console.log("[v0] Missing file or withdrawal data")
      toast.error("Selecione um arquivo primeiro")
      return
    }

    setIsUploading(true)

    try {
      console.log("[v0] Starting upload process...")

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${withdrawal.id}-${Date.now()}.${fileExt}`

      console.log("[v0] Uploading to payment-proofs bucket:", fileName)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        console.error("[v0] Upload error:", uploadError)
        throw new Error(uploadError.message)
      }

      console.log("[v0] Upload successful:", uploadData)

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-proofs").getPublicUrl(fileName)

      console.log("[v0] Public URL:", publicUrl)

      // Get current user
      const { data: userData } = await supabase.auth.getUser()

      console.log("[v0] Updating withdrawal in database...")

      // Update withdrawal
      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({
          admin_proof_url: publicUrl,
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: userData?.user?.id || null,
        })
        .eq("id", withdrawal.id)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        throw new Error(updateError.message)
      }

      console.log("[v0] Withdrawal updated successfully")

      toast.success("Comprovante enviado com sucesso!")

      // Reset state
      setFile(null)
      setPreview(null)
      setIsUploading(false)

      // Close modal
      onOpenChange(false)

      // Refresh data
      if (onSuccess) {
        console.log("[v0] Calling onSuccess...")
        setTimeout(() => onSuccess(), 100)
      }

      console.log("[v0] Process completed")
    } catch (error: any) {
      console.error("[v0] Error in handleUpload:", error)
      toast.error(`Erro: ${error.message || "Falha ao enviar comprovante"}`)
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreview(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        console.log("[v0] Dialog onOpenChange:", newOpen)
        if (!isUploading) {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Comprovante de Pagamento</DialogTitle>
          <DialogDescription>
            Faça upload do comprovante de pagamento para o saque de R$ {withdrawal?.amount?.toFixed(2) || "0.00"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-white/10 bg-white/5 p-8">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Selecione o comprovante</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP ou PDF até 5MB</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="proof-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="proof-upload"
                className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                Escolher Arquivo
              </label>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {preview ? (
                    <img src={preview || "/placeholder.svg"} alt="Preview" className="h-16 w-16 rounded object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-white/10">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log("[v0] Cancel button clicked")
                onOpenChange(false)
              }}
              disabled={isUploading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                console.log("[v0] Upload button clicked")
                handleUpload()
              }}
              disabled={!file || isUploading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar e Marcar como Pago
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
