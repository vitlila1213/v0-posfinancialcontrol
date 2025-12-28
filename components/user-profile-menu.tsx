"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { LogOut, Upload } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSupabase } from "@/lib/supabase-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createBrowserClient } from "@/lib/supabase-client"
import { resizeImage } from "@/lib/image-utils"

export function UserProfileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile, refreshProfile } = useSupabase()
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
      toast.success("Você saiu com sucesso")
    } catch (error) {
      console.error("Erro ao sair:", error)
      toast.error("Erro ao sair")
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    console.log("[v0] handlePhotoUpload iniciado")
    console.log("[v0] File:", file?.name, file?.size, file?.type)

    if (!file) {
      console.log("[v0] Nenhum arquivo selecionado")
      toast.error("Nenhum arquivo selecionado")
      return
    }

    toast.info("Processando imagem...", { duration: 10000 })
    setIsUploading(true)

    try {
      console.log("[v0] Iniciando redimensionamento...")

      const resizedFile = await resizeImage(file)
      console.log("[v0] Imagem redimensionada com sucesso:", resizedFile.size)

      toast.info("Fazendo upload...", { duration: 5000 })
      const fileName = `${profile?.id}-${Date.now()}.jpg`
      const filePath = `avatars/${fileName}`

      console.log("[v0] Iniciando upload para:", filePath)

      const { data: buckets } = await supabase.storage.listBuckets()
      console.log(
        "[v0] Buckets existentes:",
        buckets?.map((b) => b.name),
      )

      const bucketExists = buckets?.some((b) => b.name === "avatars")

      if (!bucketExists) {
        console.log("[v0] Criando bucket avatars...")
        const { error: createError } = await supabase.storage.createBucket("avatars", { public: true })
        if (createError) {
          console.error("[v0] Erro ao criar bucket:", createError)
        }
      }

      console.log("[v0] Fazendo upload do arquivo...")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resizedFile, {
          upsert: true,
          contentType: "image/jpeg",
        })

      if (uploadError) {
        console.error("[v0] Erro no upload:", uploadError)
        throw uploadError
      }

      console.log("[v0] Upload concluído:", uploadData)

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      console.log("[v0] URL pública:", publicUrl)

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile?.id)

      if (updateError) {
        console.error("[v0] Erro ao atualizar profile:", updateError)
        throw updateError
      }

      console.log("[v0] Profile atualizado com sucesso")

      await refreshProfile()
      toast.success("Foto atualizada com sucesso!")
      setIsOpen(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("[v0] Erro completo:", error)
      toast.error(`Erro: ${error.message || "Desconhecido"}`)
    } finally {
      setIsUploading(false)
    }
  }

  const getInitials = () => {
    if (!profile?.full_name) return "?"
    return profile.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:ring-2 hover:ring-primary"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
        </Avatar>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-xl"
          >
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Processando imagem..." : "Alterar Foto"}
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/heic, image/heif"
        onClick={(e) => {
          const target = e.target as HTMLInputElement
          target.value = ""
        }}
        onChange={handlePhotoUpload}
        className="hidden"
      />
    </div>
  )
}
