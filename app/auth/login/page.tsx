"use client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User, Shield } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

export default function AuthSelectionPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-pink-600/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-8 backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center">
            <Image
              src="/images/whatsapp-20image-202025-12-10-20at-2011.png"
              alt="PagNextLevel"
              width={220}
              height={60}
              className="mb-6"
              priority
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">Bem-vindo</h1>
            <p className="text-sm text-muted-foreground text-center">Selecione como você deseja acessar a plataforma</p>
          </div>

          <div className="space-y-4">
            <Link href="/auth/client/login" className="block">
              <Button
                variant="outline"
                className="w-full h-auto py-6 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center justify-center w-full">
                  <User className="mr-3 h-6 w-6 text-purple-400" />
                  <div className="text-left">
                    <div className="text-lg font-semibold text-purple-400">Área do Cliente</div>
                    <div className="text-xs text-muted-foreground mt-1">Gerencie suas transações e saldo</div>
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/auth/admin/login" className="block">
              <Button
                variant="outline"
                className="w-full h-auto py-6 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-center justify-center w-full">
                  <Shield className="mr-3 h-6 w-6 text-pink-400" />
                  <div className="text-left">
                    <div className="text-lg font-semibold text-pink-400">Painel do Gestor</div>
                    <div className="text-xs text-muted-foreground mt-1">Administre clientes e operações</div>
                  </div>
                </div>
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link href="/auth/client/signup" className="text-purple-400 hover:underline">
              Cadastre-se como cliente
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
