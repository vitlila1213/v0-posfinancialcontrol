import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "userId e newPassword são obrigatórios" },
        { status: 400 }
      )
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

    // Atualizar a senha do usuário usando a API admin
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error("[v0] Erro ao atualizar senha:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Erro na API de reset de senha:", error)
    return NextResponse.json(
      { error: "Erro interno ao processar requisição" },
      { status: 500 }
    )
  }
}
