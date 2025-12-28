import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
              <AlertCircle className="h-8 w-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Ocorreu um Erro</h1>
          </div>

          {params?.error && (
            <div className="mb-6 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-400">
              Código do erro: {params.error}
            </div>
          )}

          <p className="mb-6 text-sm text-slate-400">
            Algo deu errado durante o processo de autenticação. Por favor, tente novamente.
          </p>

          <Link href="/auth/login">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Voltar ao Login</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
