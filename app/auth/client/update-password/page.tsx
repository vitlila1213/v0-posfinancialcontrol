"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation" // Removi useSearchParams pois não vamos depender só dele
import { useState, useEffect, Suspense } from "react"
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

function UpdatePasswordContent() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Mudança: Começamos assumindo que está verificando, para não chutar o usuário antes da hora
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isValidSession, setIsValidSession] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const handleAuthCheck = async () => {
      console.log("[v0] Iniciando verificação de recuperação...")
      
      // 1. Verifica se já existe uma sessão ativa (caso o link já tenha sido processado)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log("[v0] Sessão ativa encontrada.")
        if (mounted) {
          setIsValidSession(true)
          setIsCheckingSession(false)
        }
      }

      // 2. OUVINTE MÁGICO: Este é o segredo. Ele espera o Supabase processar o link.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[v0] Evento de Auth:", event)
        
        // PASSWORD_RECOVERY: Evento específico quando clica no link de reset
        // SIGNED_IN: Evento quando a sessão é estabelecida com sucesso
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (mounted) {
            setIsValidSession(true)
            setIsCheckingSession(false)
          }
        } else if (event === "SIGNED_OUT") {
          // Se deslogou, aí sim é inválido
          if (mounted) {
             // Não redirecionamos imediatamente para dar chance ao usuário entender o que houve
             console.log("Usuário deslogado durante o processo")
          }
        }
      })

      // Timeout de segurança: Se em 10 segundos nada acontecer, aí sim redireciona
      const timeout = setTimeout(() => {
        if (mounted && !isValidSession && isCheckingSession) {
            console.log("[v0] Timeout: Nenhuma sessão estabelecida.")
            setIsCheckingSession(false)
            // Opcional: Redirecionar aqui se quiser ser agressivo
        }
      }, 10000)

      return () => {
        mounted = false
        subscription.unsubscribe()
        clearTimeout(timeout)
      }
    }

    handleAuthCheck()
  }, [supabase, isValidSession, isCheckingSession]) // Dependências ajustadas

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setIsLoading(true)

    try {
      console.log("[v0] Tentando atualizar senha...")
      
      // O usuário PRECISA estar logado (via link de recuperação) para isso funcionar
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      console.log("[v0] Senha atualizada com sucesso")
      
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Faça login.",
        className: "bg-green-600 text-white border-none"
      })

      // Importante: Deslogar o usuário para ele logar com a senha nova
      await supabase.auth.signOut()
      router.push("/auth/client/login")
      
    } catch (err: any) {
      console.error("[v0] Erro ao atualizar:", err)
      // Se o erro for "Auth session missing", o link expirou
      if (err.message?.includes("session") || err.message?.includes("User not found")) {
         setError("O link expirou ou é inválido. Solicite uma nova redefinição.")
      } else {
         setError(err.message || "Erro ao atualizar senha")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Se ainda estiver checando, mostra loading
  if (isCheckingSession && !isValidSession) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando link de segurança...</p>
        </div>
      </div>
    )
  }

  // Se terminou de checar e NÃO tem sessão, mostra erro
  if (!isCheckingSession && !isValidSession) {
     return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-card p-8 rounded-xl border border-white/10 text-center">
                <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <EyeOff className="h-8 w-8 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Link Inválido ou Expirado</h2>
                <p className="text-muted-foreground mb-6">Não conseguimos validar sua sessão. Por favor, solicite uma nova redefinição de senha.</p>
                <Button onClick={() => router.push("/auth/client/login")} className="w-full bg-purple-600">Voltar ao Login</Button>
            </div>
        </div>
     )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      {/* ... (SEU CONTEÚDO VISUAL / BACKGROUND MANTIDO IGUAL) ... */}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-8 backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center">
             {/* ... (SEUS LOGOS E TITULOS MANTIDOS) ... */}
             <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/20">
              <CheckCircle2 className="h-6 w-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
             <p className="mt-2 text-sm text-center text-muted-foreground">Digite sua nova senha abaixo.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme a senha"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">{error}</div>}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Definir Nova Senha"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <UpdatePasswordContent />
    </Suspense>
  )
}
