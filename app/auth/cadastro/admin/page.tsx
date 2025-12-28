"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useEffect } from "react"

export default function CadastroAdminPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [adminCode, setAdminCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const ADMIN_ACCESS_CODE = "GESTOR2024"

  useEffect(() => {
    router.replace("/auth/admin/signup")
  }, [router])

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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  return null
}
