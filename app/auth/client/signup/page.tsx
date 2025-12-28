"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

export default function ClientSignupPage() {
  const [accessCode, setAccessCode] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setIsLoading(false)
      return
    }

    if (!accessCode.trim()) {
      setError("Código de acesso é obrigatório")
      setIsLoading(false)
      return
    }

    try {
      console.log("[v0] Validando código de acesso:", accessCode)
      const { data: codeData, error: codeError } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", accessCode.trim().toUpperCase())
        .eq("is_used", false)
        .maybeSingle()

      if (codeError) {
        console.error("[v0] Erro ao validar código:", codeError)
        throw new Error("Erro ao validar código de acesso")
      }

      if (!codeData) {
        setError("Código de acesso inválido ou já utilizado")
        setIsLoading(false)
        return
      }

      console.log("[v0] Código validado com sucesso:", codeData)

      console.log("[v0] Criando conta sem redirect customizado para entrega mais rápida do email")

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: "client",
            access_code: accessCode.trim().toUpperCase(),
          },
        },
      })

      if (signUpError) throw signUpError

      if (signUpData.user) {
        console.log("[v0] Marcando código como usado")
        const { error: updateError } = await supabase
          .from("access_codes")
          .update({
            is_used: true,
            used_by: signUpData.user.id,
            used_at: new Date().toISOString(),
          })
          .eq("code", accessCode.trim().toUpperCase())

        if (updateError) {
          console.error("[v0] Erro ao marcar código como usado:", updateError)
        }
      }

      sessionStorage.setItem("pendingEmail", email)
      router.push("/auth/sucesso")
    } catch (err: unknown) {
      console.error("[v0] Erro no signup:", err)
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao criar conta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-8 backdrop-blur-xl">
          <Link
            href="/auth/client/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para login
          </Link>

          <div className="mb-8 flex flex-col items-center">
            <Image
              src="/images/whatsapp-20image-202025-12-10-20at-2011.png"
              alt="PagNextLevel"
              width={64}
              height={64}
              className="mb-4 rounded-xl"
              priority
            />
            <h1 className="text-2xl font-bold text-foreground">Cadastro de Cliente</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Crie sua conta para gerenciar suas transações
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="text-muted-foreground">
                Código de Acesso *
              </Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Digite o código fornecido"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground uppercase"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">Você precisa de um código de acesso para criar uma conta</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-muted-foreground">
                Nome Completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="João da Silva"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-muted-foreground">
                Telefone (WhatsApp)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  Criando conta...
                </>
              ) : (
                "Criar Conta de Cliente"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/auth/client/login" className="text-purple-400 hover:underline">
              Faça login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
