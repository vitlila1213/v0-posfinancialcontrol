"use client"

import Link from "next/link"
import { Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export default function SucessoPage() {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const email = typeof window !== "undefined" ? sessionStorage.getItem("pendingEmail") : null

  const handleResendEmail = async () => {
    if (!email) {
      setResendMessage("Email não encontrado. Por favor, faça o cadastro novamente.")
      return
    }

    setIsResending(true)
    setResendMessage("")

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("[v0] Erro ao reenviar email:", error)
        setResendMessage("Erro ao reenviar email. Tente novamente mais tarde.")
      } else {
        setResendMessage("Email reenviado com sucesso! Verifique sua caixa de entrada.")
      }
    } catch (error) {
      console.error("[v0] Erro ao reenviar email:", error)
      setResendMessage("Erro ao reenviar email. Tente novamente mais tarde.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 text-center backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Cadastro Realizado!</h1>
          </div>

          <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 p-4 text-amber-400">
            <Mail className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Verifique seu email para confirmar sua conta</p>
          </div>

          <p className="mb-6 text-sm text-slate-400">
            Enviamos um link de confirmação para {email && <span className="font-semibold text-white">{email}</span>}.
            Clique no link para ativar sua conta e começar a usar o sistema.
          </p>

          {resendMessage && (
            <Alert className="mb-4 bg-slate-800/50 border-slate-700">
              <AlertDescription className="text-sm text-slate-300">{resendMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {email && (
              <Button
                onClick={handleResendEmail}
                disabled={isResending}
                variant="outline"
                className="w-full border-slate-700 bg-slate-800/50 hover:bg-slate-800"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reenviar Email
                  </>
                )}
              </Button>
            )}

            <Link href="/auth/client/login">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Voltar para tela de login</Button>
            </Link>
          </div>
        </div>

        <Alert className="bg-blue-500/10 border-blue-500/20">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertTitle className="text-blue-400 font-semibold">Email não chegou?</AlertTitle>
          <AlertDescription className="text-sm text-slate-300 space-y-2">
            <p>Em ambiente de desenvolvimento, o Supabase não envia emails reais.</p>
            <p className="font-semibold">Soluções:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Desenvolvimento:</strong> Acesse o{" "}
                <a
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/auth/users`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Supabase Dashboard
                </a>{" "}
                e confirme manualmente o usuário
              </li>
              <li>
                <strong>Produção:</strong> Configure um provedor SMTP customizado no{" "}
                <a
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/settings/auth`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Supabase Auth Settings
                </a>
              </li>
              <li>
                <strong>Verificar:</strong> Confira sua caixa de spam e a pasta de promoções
              </li>
            </ul>
            <Link href="/auth/config-email">
              <Button variant="link" className="h-auto p-0 text-blue-400 hover:text-blue-300">
                Ver guia completo de configuração →
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
