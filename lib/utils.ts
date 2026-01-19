import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatBrandName(brand: string): string {
  if (brand === "pix") return "PIX"
  if (brand === "visa_master") return "Visa/Master"
  if (brand === "elo_amex") return "Elo/Amex"
  return brand
}

export function formatPaymentType(paymentType: string, installments?: number): string {
  if (paymentType === "pix_qrcode") return "PIX QR Code"
  if (paymentType === "pix_conta") return "PIX Conta"
  if (paymentType === "debit") return "Débito"
  if (paymentType === "credit") return `Crédito ${installments || 1}x`
  return paymentType
}
