import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get("planId")

    console.log("[v0] API: Buscando taxas para plan_id:", planId)

    if (!planId) {
      return NextResponse.json({ error: "Plan ID é obrigatório" }, { status: 400 })
    }

    // Usar variáveis de ambiente ou valores hardcoded como fallback
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dskkafxnppyyxzeizvln.supabase.co"
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    if (!supabaseServiceKey) {
      console.error("[v0] API: SUPABASE_SERVICE_ROLE_KEY não está configurada")
      return NextResponse.json(
        { error: "Configuração do servidor incompleta" },
        { status: 500 },
      )
    }

    // Criar cliente Supabase com service role key para ter permissões admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar o nome do plano
    const { data: planData, error: planError } = await supabaseAdmin
      .from("custom_plans")
      .select("name")
      .eq("id", planId)
      .single()

    if (planError) {
      console.error("[v0] API: Erro ao buscar plano:", planError)
    }

    // Buscar as taxas do plano
    const { data: rates, error: ratesError } = await supabaseAdmin
      .from("custom_plan_rates")
      .select("*")
      .eq("plan_id", planId)

    if (ratesError) {
      console.error("[v0] API: Erro ao buscar taxas:", ratesError)
      return NextResponse.json({ error: "Erro ao buscar taxas do plano" }, { status: 500 })
    }

    console.log("[v0] API: Taxas encontradas:", rates?.length || 0)

    return NextResponse.json({
      success: true,
      planName: planData?.name || "Personalizado",
      rates: rates || [],
    })
  } catch (error) {
    console.error("[v0] API: Erro na API de taxas personalizadas:", error)
    return NextResponse.json(
      { error: "Erro interno ao processar requisição" },
      { status: 500 },
    )
  }
}
