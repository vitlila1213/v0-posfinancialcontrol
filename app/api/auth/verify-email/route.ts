import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    console.log("[v0] Verificando email:", email)

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    // Criar cliente Supabase com service role key para ter permissões admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verificar se o email existe na tabela profiles
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single()

    console.log("[v0] Resultado da busca:", { data, error })

    if (error || !data) {
      console.log("[v0] Email não encontrado")
      return NextResponse.json({ error: "Email não encontrado" }, { status: 404 })
    }

    console.log("[v0] Email verificado com sucesso!")
    return NextResponse.json({ success: true, userId: data.id })
  } catch (error) {
    console.error("[v0] Erro na API de verificação de email:", error)
    return NextResponse.json({ error: "Erro interno ao processar requisição" }, { status: 500 })
  }
}
