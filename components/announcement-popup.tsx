"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import type { Announcement } from "@/lib/types"

export function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchActiveAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.log("[v0] No active announcements:", error.message)
        return
      }

      if (data) {
        const viewedKey = `announcement_viewed_${data.id}`
        const hasViewed = localStorage.getItem(viewedKey)

        if (!hasViewed) {
          setAnnouncement(data)
          setIsOpen(true)
        }
      }
    }

    fetchActiveAnnouncements()
  }, [supabase])

  const handleClose = () => {
    if (announcement) {
      localStorage.setItem(`announcement_viewed_${announcement.id}`, "true")
    }
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && announcement && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-card p-6 shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <Image
                src="/images/whatsapp-20image-202025-12-10-20at-2011.png"
                alt="PagNextLevel"
                width={48}
                height={48}
                className="rounded-xl"
              />
              <div>
                <h3 className="text-lg font-bold text-foreground">PagNextLevel</h3>
                <p className="text-sm text-muted-foreground">Aviso Importante</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h4 className="font-semibold text-amber-500">{announcement.title}</h4>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{announcement.message}</p>
            </div>

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              Entendi
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
