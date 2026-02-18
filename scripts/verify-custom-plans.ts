import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyCustomPlans() {
  console.log("🔍 Verificando planos personalizados...")

  // Buscar todos os planos personalizados
  const { data: plans, error: plansError } = await supabase
    .from("custom_plans")
    .select("*")
    .order("created_at", { ascending: false })

  if (plansError) {
    console.error("❌ Erro ao buscar planos:", plansError)
    return
  }

  if (!plans || plans.length === 0) {
    console.log("⚠️  Nenhum plano personalizado encontrado")
    return
  }

  console.log(`\n✅ ${plans.length} plano(s) personalizado(s) encontrado(s):\n`)

  // Para cada plano, buscar suas taxas
  for (const plan of plans) {
    console.log(`📋 Plano: ${plan.name} (ID: ${plan.id})`)
    console.log(`   Criado em: ${new Date(plan.created_at).toLocaleString("pt-BR")}`)

    // Buscar taxas do plano
    const { data: rates, error: ratesError } = await supabase
      .from("custom_plan_rates")
      .select("*")
      .eq("plan_id", plan.id)
      .order("brand_group", { ascending: true })
      .order("payment_type", { ascending: true })
      .order("installments", { ascending: true })

    if (ratesError) {
      console.error(`   ❌ Erro ao buscar taxas: ${ratesError.message}`)
      continue
    }

    if (!rates || rates.length === 0) {
      console.log("   ⚠️  NENHUMA TAXA ENCONTRADA PARA ESTE PLANO!")
      console.log(
        "   💡 Solução: Abra o modal de edição do plano e clique em 'Salvar' para inserir as taxas\n",
      )
      continue
    }

    console.log(`   ✅ ${rates.length} taxa(s) configurada(s):`)

    // Agrupar por brand_group
    const visaMasterRates = rates.filter((r) => r.brand_group === "VISA_MASTER")
    const eloAmexRates = rates.filter((r) => r.brand_group === "ELO_AMEX")

    if (visaMasterRates.length > 0) {
      console.log("\n   📊 Visa/Mastercard:")
      visaMasterRates.forEach((rate) => {
        const typeLabel =
          rate.payment_type === "debit"
            ? "Débito"
            : rate.payment_type === "pix_conta"
              ? "PIX Conta"
              : rate.payment_type === "pix_qrcode"
                ? "PIX QR"
                : rate.installments === 1
                  ? "Crédito à Vista"
                  : `Crédito ${rate.installments}x`
        console.log(`      - ${typeLabel}: ${rate.rate}%`)
      })
    }

    if (eloAmexRates.length > 0) {
      console.log("\n   📊 Elo/Amex:")
      eloAmexRates.forEach((rate) => {
        const typeLabel =
          rate.payment_type === "debit"
            ? "Débito"
            : rate.payment_type === "pix_conta"
              ? "PIX Conta"
              : rate.payment_type === "pix_qrcode"
                ? "PIX QR"
                : rate.installments === 1
                  ? "Crédito à Vista"
                  : `Crédito ${rate.installments}x`
        console.log(`      - ${typeLabel}: ${rate.rate}%`)
      })
    }

    console.log("\n   " + "─".repeat(60) + "\n")
  }

  // Verificar se algum usuário tem plano personalizado
  const { data: usersWithCustomPlans } = await supabase
    .from("profiles")
    .select("id, full_name, email, plan")
    .not("plan", "in", '("basic","intermediario","top")')
    .not("plan", "is", null)

  if (usersWithCustomPlans && usersWithCustomPlans.length > 0) {
    console.log(`\n👥 ${usersWithCustomPlans.length} usuário(s) com planos personalizados:\n`)
    for (const user of usersWithCustomPlans) {
      const planName = plans.find((p) => p.id === user.plan)?.name || "Plano Desconhecido"
      console.log(`   - ${user.full_name} (${user.email})`)
      console.log(`     Plano: ${planName} (${user.plan})`)
    }
  }

  console.log("\n✨ Verificação concluída!")
}

verifyCustomPlans().catch(console.error)
