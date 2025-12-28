"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

export default function AdminSignupPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [adminCode, setAdminCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const ADMIN_ACCESS_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "GESTOR2024"

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (adminCode !== ADMIN_ACCESS_CODE) {
      setError("Código de acesso inválido")
      setIsLoading(false)
      return
    }

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

    try {
      const redirectUrl = "https://v0-posfinancialcontrol-aq.vercel.app/auth/callback"

      console.log("[v0] Admin signing up with redirect:", redirectUrl)

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
            role: "admin",
          },
        },
      })

      if (signUpError) throw signUpError

      sessionStorage.setItem("pendingEmail", email)
      router.push("/auth/sucesso")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao criar conta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-pink-600/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-8 backdrop-blur-xl">
          <Link
            href="/auth/admin/login"
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
            <h1 className="text-2xl font-bold text-foreground">Cadastro de Gestor</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">Crie sua conta de administrador</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminCode" className="text-muted-foreground">
                Código de Acesso
              </Label>
              <Input
                id="adminCode"
                type="password"
                placeholder="Digite o código de acesso"
                required
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="border-pink-500/30 bg-pink-500/10 text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Solicite o código com o administrador do sistema</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-muted-foreground">
                Nome Completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Maria da Silva"
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
                placeholder="gestor@empresa.com"
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
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
                Confirmar Senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-white/10 bg-secondary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {error && <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">{error}</div>}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar Conta de Gestor"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/auth/admin/login" className="text-pink-400 hover:underline">
              Faça login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
