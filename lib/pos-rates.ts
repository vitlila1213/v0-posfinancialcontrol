export type PlanType = "basic" | "intermediario" | "top" | string | null

export const PLAN_NAMES: Record<string, string> = {
  basic: "Básico",
  intermediario: "Intermediário",
  top: "Master",
}

// Taxas do Plano Básico
const PLANO_BASICO = {
  VISA_MASTER: {
    name: "Visa / Master",
    debit: 3.3,
    credit: {
      1: 4.76,
      2: 6.43,
      3: 6.9,
      4: 7.28,
      5: 7.75,
      6: 8.32,
      7: 8.88,
      8: 9.45,
      9: 10.0,
      10: 10.58,
      11: 11.13,
      12: 12.1,
      13: 13.48,
      14: 13.92,
      15: 14.57,
      16: 15.22,
      17: 15.87,
      18: 16.83,
    },
  },
  ELO_AMEX: {
    name: "Elo / Amex",
    debit: 2.9,
    credit: {
      1: 5.16,
      2: 7.03,
      3: 7.76,
      4: 8.49,
      5: 9.2,
      6: 9.91,
      7: 12.11,
      8: 12.81,
      9: 13.5,
      10: 14.18,
      11: 14.85,
      12: 15.52,
      13: 16.18,
      14: 16.83,
      15: 17.48,
      16: 18.12,
      17: 18.76,
      18: 19.39,
    },
  },
  PIX: {
    name: "PIX",
    pix_conta: 1.0,
    pix_qrcode: 1.5,
  },
}

// Taxas do Plano Intermediário
const PLANO_INTERMEDIARIO = {
  VISA_MASTER: {
    name: "Visa / Master",
    debit: 2.29,
    credit: {
      1: 4.29,
      2: 5.13,
      3: 5.78,
      4: 6.42,
      5: 7.06,
      6: 7.69,
      7: 8.51,
      8: 9.13,
      9: 9.74,
      10: 10.2,
      11: 10.95,
      12: 11.55,
      13: 12.94,
      14: 13.53,
      15: 14.11,
      16: 14.69,
      17: 15.26,
      18: 15.83,
    },
  },
  ELO_AMEX: {
    name: "Elo / Amex",
    debit: 3.0,
    credit: {
      1: 4.99,
      2: 6.3,
      3: 6.99,
      4: 7.68,
      5: 8.35,
      6: 9.02,
      7: 10.47,
      8: 11.13,
      9: 11.78,
      10: 12.43,
      11: 13.06,
      12: 13.7,
      13: 14.32,
      14: 14.94,
      15: 15.56,
      16: 16.17,
      17: 16.77,
      18: 17.37,
    },
  },
  PIX: {
    name: "PIX",
    pix_conta: 0.75,
    pix_qrcode: 1.3,
  },
}

// Taxas do Plano Top
const PLANO_TOP = {
  VISA_MASTER: {
    name: "Visa / Master",
    debit: 1.99,
    credit: {
      1: 3.99,
      2: 4.83,
      3: 5.48,
      4: 6.12,
      5: 6.76,
      6: 7.39,
      7: 8.21,
      8: 8.83,
      9: 9.44,
      10: 10.05,
      11: 10.65,
      12: 11.25,
      13: 12.64,
      14: 13.23,
      15: 13.81,
      16: 14.39,
      17: 14.96,
      18: 15.53,
    },
  },
  ELO_AMEX: {
    name: "Elo / Amex",
    debit: 3.1,
    credit: {
      1: 5.19,
      2: 6.37,
      3: 7.02,
      4: 7.66,
      5: 8.3,
      6: 8.93,
      7: 10.34,
      8: 10.96,
      9: 11.57,
      10: 12.18,
      11: 12.78,
      12: 13.38,
      13: 13.97,
      14: 14.56,
      15: 15.14,
      16: 15.72,
      17: 16.29,
      18: 16.86,
    },
  },
  PIX: {
    name: "PIX",
    pix_conta: 0.5,
    pix_qrcode: 1.0,
  },
}

// Mapeamento dos planos
export const PLAN_RATES = {
  basic: PLANO_BASICO,
  intermediario: PLANO_INTERMEDIARIO,
  top: PLANO_TOP,
} as const

// Exportar para compatibilidade
export const POS_RATES = PLANO_TOP

export type BrandGroup = "VISA_MASTER" | "ELO_AMEX" | "PIX"
export type PaymentType = "debit" | "credit" | "pix_conta" | "pix_qrcode"
export type Installments = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18

export interface FeeCalculation {
  grossAmount: number
  netAmount: number
  feeAmount: number
  feePercentage: number
}

export interface ChargeValueCalculation {
  desiredNetAmount: number // Valor que quer receber
  feePercentage: number // Taxa aplicada
  chargeAmount: number // Valor a cobrar do cliente
  feeAmount: number // Valor da taxa
}

export interface SaleValueCalculation {
  baseAmount: number // Valor base do produto
  feePercentage: number // Taxa aplicada
  totalAmount: number // Total que o comprador paga (base + taxa)
  installmentValue: number // Valor de cada parcela
  installments: number // Número de parcelas
}

import type { CustomPlanRate } from "./types"

export function getCustomPlanRate(
  rates: CustomPlanRate[],
  brandGroup: BrandGroup,
  paymentType: PaymentType,
  installments: Installments = 1,
): number | null {
  // Buscar taxa específica
  const rate = rates.find((r) => {
    if (r.brand_group !== brandGroup) return false
    if (r.payment_type !== paymentType) return false

    // Para crédito, precisa bater o número de parcelas
    if (paymentType === "credit") {
      return r.installments === installments
    }

    // Para outros tipos, installments é null
    return r.installments === null
  })

  return rate ? rate.rate : null
}

export function calculateFee(
  grossAmount: number,
  brandGroup: BrandGroup,
  paymentType: PaymentType,
  installments: Installments = 1,
  plan: PlanType = "top",
  customRates?: CustomPlanRate[],
): FeeCalculation {
  if (!plan) {
    return {
      grossAmount,
      netAmount: 0,
      feeAmount: 0,
      feePercentage: 0,
    }
  }

  let feePercentage: number

  // Se é plano personalizado (UUID)
  if (plan !== "basic" && plan !== "intermediario" && plan !== "top" && customRates) {
    const customRate = getCustomPlanRate(customRates, brandGroup, paymentType, installments)
    if (customRate === null) {
      console.warn("[v0] Taxa não encontrada para plano personalizado")
      return {
        grossAmount,
        netAmount: 0,
        feeAmount: 0,
        feePercentage: 0,
      }
    }
    feePercentage = customRate
  } else {
    // Plano fixo (basic, intermediario, top)
    const rates = PLAN_RATES[plan as "basic" | "intermediario" | "top"][brandGroup]

    if (!rates) {
      console.error("[v0] Rates not found for brandGroup:", brandGroup, "plan:", plan)
      return {
        grossAmount,
        netAmount: 0,
        feeAmount: 0,
        feePercentage: 0,
      }
    }

    if (paymentType === "pix_conta") {
      feePercentage = (rates as any).pix_conta
      if (feePercentage === undefined) {
        console.error("[v0] pix_conta rate not found for brandGroup:", brandGroup)
        feePercentage = 0
      }
    } else if (paymentType === "pix_qrcode") {
      feePercentage = (rates as any).pix_qrcode
      if (feePercentage === undefined) {
        console.error("[v0] pix_qrcode rate not found for brandGroup:", brandGroup)
        feePercentage = 0
      }
    } else if (paymentType === "debit") {
      feePercentage = (rates as any).debit
      if (feePercentage === undefined) {
        console.error("[v0] debit rate not found for brandGroup:", brandGroup)
        feePercentage = 0
      }
    } else {
      feePercentage = (rates as any).credit[installments]
      if (feePercentage === undefined) {
        console.error("[v0] credit rate not found for installments:", installments, "brandGroup:", brandGroup)
        feePercentage = 0
      }
    }
  }

  const feeAmount = (grossAmount * feePercentage) / 100
  const netAmount = grossAmount - feeAmount

  return {
    grossAmount,
    netAmount,
    feeAmount,
    feePercentage,
  }
}

export function calculateSaleValue(
  baseAmount: number,
  brandGroup: BrandGroup,
  paymentType: PaymentType,
  installments: Installments = 1,
  plan: PlanType = "top",
  customRates?: CustomPlanRate[],
): SaleValueCalculation {
  console.log("[v0] calculateSaleValue chamada:", { baseAmount, brandGroup, paymentType, installments, plan, customRatesLength: customRates?.length || 0 })
  
  if (!plan) {
    console.warn("[v0] calculateSaleValue: Plano não definido")
    return {
      baseAmount,
      feePercentage: 0,
      totalAmount: baseAmount,
      installmentValue: baseAmount,
      installments: 1,
    }
  }

  let feePercentage: number

  // Se é plano personalizado (UUID)
  if (plan !== "basic" && plan !== "intermediario" && plan !== "top") {
    console.log("[v0] calculateSaleValue: Usando plano personalizado")
    if (!customRates || customRates.length === 0) {
      console.warn("[v0] Plano personalizado sem taxas carregadas")
      return {
        baseAmount,
        feePercentage: 0,
        totalAmount: baseAmount,
        installmentValue: baseAmount,
        installments: 1,
      }
    }

    console.log("[v0] Buscando taxa customizada:", { brandGroup, paymentType, installments })
    const customRate = getCustomPlanRate(customRates, brandGroup, paymentType, installments)
    console.log("[v0] Taxa customizada encontrada:", customRate)
    
    if (customRate === null) {
      console.warn("[v0] Taxa não encontrada para plano personalizado")
      return {
        baseAmount,
        feePercentage: 0,
        totalAmount: baseAmount,
        installmentValue: baseAmount,
        installments: 1,
      }
    }
    feePercentage = customRate
  } else {
    // Plano fixo
    console.log("[v0] calculateSaleValue: Usando plano fixo:", plan)
    const rates = PLAN_RATES[plan as "basic" | "intermediario" | "top"]
    if (!rates) {
      console.error("[v0] Plano inválido:", plan)
      return {
        baseAmount,
        feePercentage: 0,
        totalAmount: baseAmount,
        installmentValue: baseAmount,
        installments: 1,
      }
    }

    console.log("[v0] Bandeiras disponíveis:", Object.keys(rates))
    const brandRates = rates[brandGroup]
    if (!brandRates) {
      console.error("[v0] Bandeira inválida:", brandGroup, "Disponíveis:", Object.keys(rates))
      return {
        baseAmount,
        feePercentage: 0,
        totalAmount: baseAmount,
        installmentValue: baseAmount,
        installments: 1,
      }
    }

    if (paymentType === "pix_conta") {
      feePercentage = (brandRates as any).pix_conta
    } else if (paymentType === "pix_qrcode") {
      feePercentage = (brandRates as any).pix_qrcode
    } else if (paymentType === "debit") {
      feePercentage = (brandRates as any).debit
    } else {
      feePercentage = (brandRates as any).credit[installments]
    }
  }

  const totalAmount = baseAmount * (1 - feePercentage / 100)
  const installmentValue = totalAmount / installments

  return {
    baseAmount,
    feePercentage,
    totalAmount,
    installmentValue,
    installments,
  }
}

export function calculateChargeValue(
  desiredNetAmount: number,
  brandGroup: BrandGroup,
  paymentType: PaymentType,
  installments: Installments = 1,
  plan: PlanType = "top",
  customRates?: CustomPlanRate[],
): ChargeValueCalculation {
  if (!plan) {
    return {
      desiredNetAmount,
      feePercentage: 0,
      chargeAmount: desiredNetAmount,
      feeAmount: 0,
    }
  }

  let feePercentage: number

  if (plan !== "basic" && plan !== "intermediario" && plan !== "top") {
    if (!customRates || customRates.length === 0) {
      console.warn("[v0] Plano personalizado sem taxas carregadas")
      return {
        desiredNetAmount,
        feePercentage: 0,
        chargeAmount: desiredNetAmount,
        feeAmount: 0,
      }
    }

    console.log("[v0] calculateChargeValue - Buscando taxa customizada:", { brandGroup, paymentType, installments, totalRates: customRates.length })
    const customRate = getCustomPlanRate(customRates, brandGroup, paymentType, installments)
    console.log("[v0] calculateChargeValue - Taxa encontrada:", customRate)
    
    if (customRate === null) {
      console.warn("[v0] Taxa não encontrada para plano personalizado:", { brandGroup, paymentType, installments })
      return {
        desiredNetAmount,
        feePercentage: 0,
        chargeAmount: desiredNetAmount,
        feeAmount: 0,
      }
    }
    feePercentage = customRate
  } else {
    // Plano fixo
    console.log("[v0] calculateChargeValue - Usando plano fixo:", plan)
    const rates = PLAN_RATES[plan as "basic" | "intermediario" | "top"]
    if (!rates) {
      console.error("[v0] Plano inválido:", plan)
      return {
        desiredNetAmount,
        feePercentage: 0,
        chargeAmount: desiredNetAmount,
        feeAmount: 0,
      }
    }

    console.log("[v0] calculateChargeValue - Buscando bandeira:", brandGroup, "Bandeiras disponíveis:", Object.keys(rates))
    const brandRates = rates[brandGroup]
    if (!brandRates) {
      console.error("[v0] Bandeira inválida:", brandGroup, "Bandeiras disponíveis:", Object.keys(rates))
      return {
        desiredNetAmount,
        feePercentage: 0,
        chargeAmount: desiredNetAmount,
        feeAmount: 0,
      }
    }

    console.log("[v0] calculateChargeValue - brandRates:", brandRates, "paymentType:", paymentType)
    if (paymentType === "pix_conta") {
      feePercentage = (brandRates as any).pix_conta
      console.log("[v0] calculateChargeValue - PIX Conta taxa:", feePercentage)
    } else if (paymentType === "pix_qrcode") {
      feePercentage = (brandRates as any).pix_qrcode
      console.log("[v0] calculateChargeValue - PIX QR Code taxa:", feePercentage)
    } else if (paymentType === "debit") {
      feePercentage = (brandRates as any).debit
    } else {
      feePercentage = (brandRates as any).credit[installments]
    }
  }

  const chargeAmountRaw = desiredNetAmount / (1 - feePercentage / 100)
  const chargeAmount = Math.ceil(chargeAmountRaw * 100) / 100
  const feeAmount = chargeAmount - desiredNetAmount

  return {
    desiredNetAmount,
    feePercentage,
    chargeAmount,
    feeAmount,
  }
}

export function getPlanRates(plan: PlanType) {
  if (!plan) return null
  return PLAN_RATES[plan]
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0.00%"
  }
  return `${value.toFixed(2)}%`
}
