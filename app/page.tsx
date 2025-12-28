import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verifica o role do usuário
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  const userRole = profile?.role || "client"

  // Redireciona para a área correta
  if (userRole === "admin") {
    redirect("/admin")
  } else {
    redirect("/cliente")
  }
}
