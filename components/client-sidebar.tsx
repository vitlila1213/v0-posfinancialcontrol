"use client"

import { memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, CreditCard, Wallet, ChevronRight, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSupabase } from "@/lib/supabase-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

interface ClientSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export const ClientSidebar = memo(function ClientSidebar({ isOpen, onToggle }: ClientSidebarProps) {
  const { profile, logout } = useSupabase()
  const pathname = usePathname()

  const tabs = [
    { id: "dashboard", label: "Painel", icon: LayoutDashboard, href: "/cliente" },
    { id: "transactions", label: "Transações", icon: CreditCard, href: "/cliente/transacoes" },
    { id: "withdrawals", label: "Saques", icon: Wallet, href: "/cliente/saques" },
  ]

  const handleNavigation = () => {
    if (window.innerWidth < 1024) {
      onToggle()
    }
  }

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-card text-foreground backdrop-blur-xl lg:hidden"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/5 bg-sidebar will-change-transform",
          "lg:translate-x-0 lg:transition-none",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-4">
          <Image
            src="/images/whatsapp-20image-202025-12-10-20at-2011.png"
            alt="PagNextLevel"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          <div>
            <h1 className="text-sm font-semibold text-foreground">PagNextLevel</h1>
            <p className="text-xs text-muted-foreground">Área do Cliente</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto overscroll-contain">
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Menu</p>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={handleNavigation}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/5 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="clientActiveTab"
                    className="absolute left-0 top-0 h-full w-1 rounded-r-full brand-gradient"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("h-4 w-4", isActive && "text-purple-400")} />
                <span>{tab.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-purple-400" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/5 p-4 pb-safe">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs text-muted-foreground">Logado como</p>
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.full_name || profile?.email || "Cliente"}
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  )
})
