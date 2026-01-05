export type PlanType = "basico" | "intermediario" | "top" | null

export const PLAN_NAMES: Record<string, string> = {
  basico: "Básico",
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
    pix_conta: 0.5,
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
    pix_conta: 0.5,
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
  basico: PLANO_BASICO,
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

export function calculateFee(
  grossAmount: number,
  brandGroup: BrandGroup,
  paymentType: PaymentType,
  installments: Installments = 1,
  plan: PlanType = "top",
): FeeCalculation {
  // Se não tem plano atribuído, não pode calcular
  if (!plan) {
    return {
      grossAmount,
      netAmount: 0,
      feeAmount: 0,
      feePercentage: 0,
    }
  }

  const rates = PLAN_RATES[plan][brandGroup]

  let feePercentage: number

  if (paymentType === "pix_conta") {
    feePercentage = (rates as any).pix_conta
  } else if (paymentType === "pix_qrcode") {
    feePercentage = (rates as any).pix_qrcode
  } else if (paymentType === "debit") {
    feePercentage = (rates as any).debit
  } else {
    feePercentage = (rates as any).credit[installments]
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
): SaleValueCalculation {
  if (!plan) {
    return {
      baseAmount,
      feePercentage: 0,
      totalAmount: baseAmount,
      installmentValue: baseAmount,
      installments: 1,
    }
  }

  const rates = PLAN_RATES[plan][brandGroup]

  let feePercentage: number

  if (paymentType === "pix_conta") {
    feePercentage = (rates as any).pix_conta
  } else if (paymentType === "pix_qrcode") {
    feePercentage = (rates as any).pix_qrcode
  } else if (paymentType === "debit") {
    feePercentage = (rates as any).debit
  } else {
    feePercentage = (rates as any).credit[installments]
  }

  // Calculate total with fee included
  const totalAmount = baseAmount * (1 + feePercentage / 100)
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
): ChargeValueCalculation {
  // Se não tem plano atribuído, não pode calcular
  if (!plan) {
    return {
      desiredNetAmount,
      feePercentage: 0,
      chargeAmount: desiredNetAmount,
      feeAmount: 0,
    }
  }

  const rates = PLAN_RATES[plan][brandGroup]

  let feePercentage: number

  if (paymentType === "pix_conta") {
    feePercentage = (rates as any).pix_conta
  } else if (paymentType === "pix_qrcode") {
    feePercentage = (rates as any).pix_qrcode
  } else if (paymentType === "debit") {
    feePercentage = (rates as any).debit
  } else {
    feePercentage = (rates as any).credit[installments]
  }

  // FÓRMULA: Valor a Cobrar = Valor Desejado ÷ (1 - Taxa ÷ 100)
  // Exemplo: 5000 ÷ (1 - 12.64 ÷ 100) = 5000 ÷ (1 - 0.1264) = 5000 ÷ 0.8736
  const chargeAmountRaw = desiredNetAmount / (1 - feePercentage / 100)

  // Arredondar para cima para garantir que o valor recebido seja exato
  const chargeAmount = Math.ceil(chargeAmountRaw * 100) / 100
  const feeAmount = chargeAmount - desiredNetAmount

  console.log("[v0] Cálculo simplificado:", {
    desiredNetAmount,
    feePercentage: `${feePercentage}%`,
    passo1_subtracao: `1 - ${feePercentage}/100 = ${1 - feePercentage / 100}`,
    passo2_divisao: `${desiredNetAmount} / ${1 - feePercentage / 100} = ${chargeAmountRaw}`,
    chargeAmountRaw,
    chargeAmount_arredondado: chargeAmount,
    feeAmount,
  })

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
