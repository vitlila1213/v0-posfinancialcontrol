export type TransactionStatus =
  | "pending_receipt"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "paid"
  | "chargeback"

export type WithdrawalStatus = "pending" | "paid" | "cancelled"

export type Brand = "visa_master" | "elo_amex" | "pix"

export type PaymentType = "debit" | "credit" | "pix_conta" | "pix_qrcode"

export type PlanType = "basico" | "intermediario" | "top" | null

export type AdjustmentType = "add" | "remove"

export type WithdrawalMethod = "pix" | "bank" | "boleto"

export type PixKeyType = "cpf" | "phone" | "email" | "random"

export interface Transaction {
  id: string
  user_id: string
  gross_value: number
  net_value: number
  fee_value: number
  fee_percentage: number
  brand: Brand
  payment_type: PaymentType
  installments: number
  receipt_url: string | null
  no_receipt_reason: string | null
  status: TransactionStatus
  rejection_reason: string | null
  verified_at: string | null
  verified_by: string | null
  is_chargeback: boolean
  chargeback_reason: string | null
  chargeback_at: string | null
  created_at: string
  updated_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  status: WithdrawalStatus
  withdrawal_method: WithdrawalMethod
  pix_key: string | null
  pix_key_type: PixKeyType | null // Added PIX key type field
  pix_owner_name: string | null // Added PIX owner name field
  bank_name: string | null
  bank_agency: string | null
  bank_account: string | null
  boleto_name: string | null
  boleto_beneficiary_name: string | null
  boleto_number: string | null
  boleto_value: number | null
  boleto_origin: string | null
  admin_proof_url: string | null
  paid_by: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  pix_key: string | null
  bank_name: string | null
  bank_agency: string | null
  bank_account: string | null
  role: "client" | "admin"
  plan: PlanType
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type:
    | "receipt_uploaded"
    | "receipt_verified"
    | "receipt_rejected"
    | "withdrawal_requested"
    | "withdrawal_paid"
    | "plan_assigned"
  title: string
  message: string
  related_id: string | null
  read: boolean
  created_at: string
}

export interface ClientBalances {
  available: number
  pending: number
  withdrawn: number
  total: number
}

export interface BalanceAdjustment {
  id: string
  user_id: string
  admin_id: string
  type: AdjustmentType
  amount: number
  reason: string
  created_at: string
}

export interface AccessCode {
  id: string
  code: string
  is_used: boolean
  used_by: string | null
  created_at: string
  created_by: string | null
  used_at: string | null
}

export interface Announcement {
  id: string
  title: string
  message: string
  is_active: boolean
  created_at: string
  created_by: string | null
  updated_at: string
}
