"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { SupabaseProvider } from "@/lib/supabase-context"
import { ClientSidebar } from "@/components/client-sidebar"
import { NotificationsBell } from "@/components/notifications-bell"
import { CompactBalanceCard } from "@/components/compact-balance-card"
import { ClientNotificationsProvider } from "@/components/client-notifications-provider"
import { cn } from "@/lib/utils"
import { UserProfileMenu } from "@/components/user-profile-menu"

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <SupabaseProvider>
      <ClientNotificationsProvider>
        <div className="flex min-h-screen bg-slate-950">
          <ClientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className={cn("flex-1 transition-all duration-300", "lg:ml-64")}>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-white/5 bg-slate-950 px-4 pt-safe lg:backdrop-blur-xl lg:bg-slate-950/80 lg:px-6">
              <div className="lg:hidden w-10" />
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <CompactBalanceCard />
                <NotificationsBell />
                <UserProfileMenu />
              </div>
            </header>
            <div className="p-4 pb-safe lg:p-6">{children}</div>
          </main>
        </div>
      </ClientNotificationsProvider>
    </SupabaseProvider>
  )
}
