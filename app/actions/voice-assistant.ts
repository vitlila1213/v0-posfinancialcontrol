"use server"

import { z } from "zod"

const VoiceCommandSchema = z.object({
  intent: z.enum(["update_data", "next_step", "submit", "unknown"]),
  data: z
    .object({
      amount: z.number().optional(),
      installments: z.number().min(1).max(18).optional(),
      payment_type: z.enum(["credito", "debito", "pix_qr", "pix_conta"]).optional(),
      card_brand: z.enum(["VISA_MASTER", "ELO_AMEX", "PIX"]).optional(),
    })
    .optional(),
})

export type VoiceCommand = z.infer<typeof VoiceCommandSchema>
export type ReceiptData = {
  amount: number
  installments: number
  payment_type: "credito" | "debito" | "pix_qr" | "pix_conta"
}

export async function processVoiceCommand(audioBlob: Blob): Promise<VoiceCommand> {
  try {
    // 1. Transcrever áudio com Whisper
    const formData = new FormData()
    formData.append("file", audioBlob, "audio.webm")
    formData.append("model", "whisper-1")

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      throw new Error("Erro ao transcrever áudio")
    }

    const { text: transcription } = await transcriptionResponse.json()
    console.log("[v0] Transcrição:", transcription)

    // 2. Processar com GPT-4o-mini para extrair intenção e dados
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um assistente financeiro que extrai dados de comprovantes de maquininha ou áudios de transação. Sua saída deve ser EXCLUSIVAMENTE um JSON com os campos: amount (number), installments (number), payment_type (string), card_brand (string).

Intenções possíveis:
- "update_data": quando o usuário menciona valores, tipo de pagamento, parcelas ou bandeira do cartão
- "next_step": quando diz "continuar", "próximo", "avançar", "próxima etapa"
- "submit": quando diz "adicionar", "finalizar", "confirmar", "salvar"
- "unknown": quando não entender o comando

═══════════════════════════════════════════════════
REGRAS ESTRITAS DE EXTRAÇÃO:
═══════════════════════════════════════════════════

1. VALOR (amount):
   - Deve ser numérico (float). Ex: 150.00
   - Converta texto para número: "cinquenta reais" = 50, "mil e quinhentos" = 1500
   - Nunca retorne 0 se houver menção a valor

2. PARCELAS (installments):
   - Busque por: "3 vezes", "12 vezes", "em 3", "parcelado em 12", "3x", "12x"
   - Converta texto: "três vezes" = 3, "doze vezes" = 12
   - Limite: 1 a 18 parcelas
   - Se débito ou PIX, SEMPRE = 1 parcela (ignore menção a parcelas)
   - Se crédito SEM mencionar parcelas = 1 parcela

3. TIPO DE PAGAMENTO (Mapeamento Obrigatório):

   CRÉDITO (retorne "credito"):
   - Se mencionar "crédito", "parcelado", "parcelas", "vezes", "X vezes"
   - Se installments > 1, SEMPRE é crédito
   
   DÉBITO (retorne "debito"):
   - Se mencionar apenas "débito" ou "à vista" SEM parcelas
   - Débito SEMPRE tem installments = 1

   PIX (retorne "pix_qr" ou "pix_conta"):
   - Se mencionar "PIX"
   - QR Code = "pix_qr" (padrão se não especificar)
   - Transferência/chave = "pix_conta"
   - PIX SEMPRE tem installments = 1

4. BANDEIRA DO CARTÃO (card_brand) - NOVO CAMPO OBRIGATÓRIO:

   VISA_MASTER (retorne "VISA_MASTER"):
   - Se mencionar "Visa", "Master", "Mastercard", "Visa ou Master"
   - Variações: "visa master", "visa/master", "visa e master"
   
   ELO_AMEX (retorne "ELO_AMEX"):
   - Se mencionar "Elo", "Amex", "American Express", "Elo ou Amex"
   - Variações: "elo amex", "elo/amex", "elo e amex"
   
   PIX (retorne "PIX"):
   - Se mencionar "PIX" no payment_type, SEMPRE card_brand = "PIX"
   - Se não mencionar bandeira e for débito/crédito, assuma "VISA_MASTER" (padrão)

EXEMPLOS CORRETOS:

Comando: "Cinquenta reais no crédito Visa em 12 vezes"
{"intent": "update_data", "data": {"amount": 50, "installments": 12, "payment_type": "credito", "card_brand": "VISA_MASTER"}}

Comando: "Duzentos reais parcelado em 3 vezes no Elo"
{"intent": "update_data", "data": {"amount": 200, "installments": 3, "payment_type": "credito", "card_brand": "ELO_AMEX"}}

Comando: "Cem reais no débito Master"
{"intent": "update_data", "data": {"amount": 100, "installments": 1, "payment_type": "debito", "card_brand": "VISA_MASTER"}}

Comando: "PIX de cinquenta"
{"intent": "update_data", "data": {"amount": 50, "installments": 1, "payment_type": "pix_qr", "card_brand": "PIX"}}

Comando: "Visa" (apenas bandeira)
{"intent": "update_data", "data": {"card_brand": "VISA_MASTER"}}

Comando: "Continuar"
{"intent": "next_step"}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`,
          },
          {
            role: "user",
            content: transcription,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    })

    if (!gptResponse.ok) {
      throw new Error("Erro ao processar comando com GPT")
    }

    const gptData = await gptResponse.json()
    const commandText = gptData.choices[0].message.content
    console.log("[v0] Comando GPT:", commandText)

    const command = JSON.parse(commandText)

    if (command.data) {
      if (command.data.payment_type === "pix_qr" || command.data.payment_type === "pix_conta") {
        command.data.card_brand = "PIX"
      }

      // Se tem parcelas > 1, força crédito
      if (command.data.installments && command.data.installments > 1) {
        command.data.payment_type = "credito"
      }

      // Se é débito ou PIX, força 1 parcela
      if (
        command.data.payment_type === "debito" ||
        command.data.payment_type === "pix_qr" ||
        command.data.payment_type === "pix_conta"
      ) {
        command.data.installments = 1
      }

      // Garantir range de parcelas
      if (command.data.installments) {
        if (command.data.installments < 1) command.data.installments = 1
        if (command.data.installments > 18) command.data.installments = 18
      }

      // Added card_brand logic for default value
      if (!command.data.card_brand) {
        command.data.card_brand = "VISA_MASTER"
      }
    }

    return VoiceCommandSchema.parse(command)
  } catch (error) {
    console.error("[v0] Erro ao processar comando de voz:", error)
    return { intent: "unknown" }
  }
}
