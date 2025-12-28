"use client"

import { useEffect, useRef, useCallback } from "react"

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasPermissionRef = useRef(false)

  useEffect(() => {
    // Create audio element
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sales-FF4AqVgd4kh4R5DUOaPIDzF98cCpSF.mp3")
      audioRef.current.volume = 0.7
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        hasPermissionRef.current = permission === "granted"
      })
    } else if ("Notification" in window && Notification.permission === "granted") {
      hasPermissionRef.current = true
    }
  }, [])

  const playNotification = useCallback(async (title: string, body: string) => {
    try {
      // Play sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        await audioRef.current.play().catch((e) => {
          console.log("[v0] Audio play failed:", e)
        })
      }

      // Show browser notification if permission granted
      if (hasPermissionRef.current && "Notification" in window) {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "app-notification",
          requireInteraction: false,
        })
      }
    } catch (error) {
      console.error("[v0] Notification error:", error)
    }
  }, [])

  return { playNotification }
}
