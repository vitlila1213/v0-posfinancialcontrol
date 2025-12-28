"use client"

import { useEffect, useState } from "react"
import { motion, useSpring } from "framer-motion"
import { formatCurrency } from "@/lib/pos-rates"

interface AnimatedNumberProps {
  value: number
  className?: string
}

export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const spring = useSpring(0, { stiffness: 75, damping: 15 })

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(latest)
    })
    return () => unsubscribe()
  }, [spring])

  return <motion.span className={className}>{formatCurrency(displayValue)}</motion.span>
}
