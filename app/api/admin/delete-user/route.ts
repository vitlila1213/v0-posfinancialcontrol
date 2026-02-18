import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  console.log("[v0] API: Delete user endpoint called")
  
  try {
    console.log("[v0] API: Parsing request body...")
    const { userId } = await request.json()
    console.log("[v0] API: Received userId:", userId)

    if (!userId) {
      console.error("[v0] API: No userId provided")
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    console.log("[v0] API: Starting deletion process for userId:", userId)

    console.log("[v0] API: Creating Supabase client...")
    const supabase = await createClient()

    // Verificar se o usuário atual é admin
    console.log("[v0] API: Checking if current user is admin...")
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      console.error("[v0] API: No authenticated user found")
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    console.log("[v0] API: Current user ID:", currentUser.id)
    
    const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single()

    console.log("[v0] API: Current user profile:", currentProfile)

    if (!currentProfile || currentProfile.role !== "admin") {
      console.error("[v0] API: User is not admin. Role:", currentProfile?.role)
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    console.log("[v0] API: Admin verified (role: admin), proceeding with deletion")

    // Criar cliente Supabase com service role key
    console.log("[v0] API: Creating Supabase admin client with service role...")
    console.log("[v0] API: SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("[v0] API: SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { createClient: createServiceClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
    
    console.log("[v0] API: Supabase admin client created successfully")

    // 1. Deletar transações do usuário
    console.log("[v0] Deleting user transactions...")
    const { error: transactionsError } = await supabaseAdmin.from("transactions").delete().eq("user_id", userId)

    if (transactionsError) {
      console.error("[v0] Error deleting transactions:", transactionsError)
    }

    // 2. Deletar saques do usuário
    console.log("[v0] Deleting user withdrawals...")
    const { error: withdrawalsError } = await supabaseAdmin.from("withdrawals").delete().eq("user_id", userId)

    if (withdrawalsError) {
      console.error("[v0] Error deleting withdrawals:", withdrawalsError)
    }

    // 3. Deletar notificações do usuário
    console.log("[v0] Deleting user notifications...")
    const { error: notificationsError } = await supabaseAdmin.from("notifications").delete().eq("user_id", userId)

    if (notificationsError) {
      console.error("[v0] Error deleting notifications:", notificationsError)
    }

    // 4. Deletar ajustes de saldo
    console.log("[v0] Deleting balance adjustments...")
    const { error: adjustmentsError } = await supabaseAdmin.from("balance_adjustments").delete().eq("user_id", userId)

    if (adjustmentsError) {
      console.error("[v0] Error deleting balance adjustments:", adjustmentsError)
    }

    // 5. Deletar chaves PIX salvas
    console.log("[v0] Deleting saved PIX keys...")
    const { error: pixKeysError } = await supabaseAdmin.from("saved_pix_keys").delete().eq("user_id", userId)

    if (pixKeysError) {
      console.error("[v0] Error deleting PIX keys:", pixKeysError)
    }

    // 6. Deletar chargebacks
    console.log("[v0] Deleting chargebacks...")
    const { error: chargebacksError } = await supabaseAdmin.from("chargebacks").delete().eq("user_id", userId)

    if (chargebacksError) {
      console.error("[v0] Error deleting chargebacks:", chargebacksError)
    }

    // 7. Deletar perfil
    console.log("[v0] Deleting user profile...")
    const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("[v0] Error deleting profile:", profileError)
      return NextResponse.json(
        { error: `Erro ao deletar perfil: ${profileError.message}` },
        { status: 500 },
      )
    }

    // 8. Deletar usuário do auth usando admin API
    console.log("[v0] API: Step 8 - Deleting user from auth.users...")
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("[v0] API: Error deleting user from auth:", authError)
      console.error("[v0] API: Auth error details:", authError.message, authError.status)
      return NextResponse.json(
        { error: `Erro ao deletar usuário do auth: ${authError.message}` },
        { status: 500 },
      )
    }

    console.log("[v0] API: ✅ User deleted successfully from auth.users!")
    console.log("[v0] API: ✅ User deleted successfully from ALL tables and auth!")

    return NextResponse.json({
      success: true,
      message: "Usuário deletado com sucesso de todas as tabelas e do sistema de autenticação",
      deletedUserId: userId,
    })
  } catch (error: any) {
    console.error("[v0] Error in delete user API:", error)
    return NextResponse.json({ error: error.message || "Erro ao deletar usuário" }, { status: 500 })
  }
}
