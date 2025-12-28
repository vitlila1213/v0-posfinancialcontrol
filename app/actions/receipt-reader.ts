"use server"

import { z } from "zod"

const ReceiptDataSchema = z.object({
  amount: z.number().positive(),
  installments: z.number().min(1).max(18),
  payment_type: z.enum(["credito", "debito", "pix_qr"]),
})

export type ReceiptData = z.infer<typeof ReceiptDataSchema>

async function callOpenAIWithRetry(imageBase64: string, maxRetries = 2): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Tentativa ${attempt}/${maxRetries} de processar comprovante...`)

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em OCR de comprovantes SafraPay. Retorne APENAS JSON válido.

TAREFA: Extrair amount, installments, payment_type de comprovantes SafraPay.

═══════════════════════════════════════════════════
PASSO 1: ENCONTRAR PARCELAS (installments)
═══════════════════════════════════════════════════

PROCURE NO COMPROVANTE A LINHA:
"PARCELADO EM XX VEZES"

ONDE XX É UM NÚMERO DE 01 ATÉ 18.

ATENÇÃO MÁXIMA - NÚMEROS PEQUENOS:
• "PARCELADO EM 01 VEZES" → installments = 1
• "PARCELADO EM 02 VEZES" → installments = 2 ⚠️ (NÃO É 12!)
• "PARCELADO EM 03 VEZES" → installments = 3 ⚠️ (NÃO É 13!)
• "PARCELADO EM 04 VEZES" → installments = 4
• "PARCELADO EM 05 VEZES" → installments = 5
• "PARCELADO EM 06 VEZES" → installments = 6
• "PARCELADO EM 07 VEZES" → installments = 7
• "PARCELADO EM 08 VEZES" → installments = 8
• "PARCELADO EM 09 VEZES" → installments = 9
• "PARCELADO EM 10 VEZES" → installments = 10
• "PARCELADO EM 11 VEZES" → installments = 11
• "PARCELADO EM 12 VEZES" → installments = 12
• "PARCELADO EM 13 VEZES" → installments = 13
...até 18

REGRA DE OURO:
1. Localize a palavra "PARCELADO"
2. Leia EXATAMENTE o número entre "EM " e " VEZES"
3. Se o número tem zero na frente (02, 03, etc.), IGNORE o zero
4. Se NÃO existe linha "PARCELADO", então installments = 1

═══════════════════════════════════════════════════
PASSO 2: EXTRAIR VALOR (amount)
═══════════════════════════════════════════════════

Procure: "VALOR:" ou "VALOR :" seguido do número com R$
Exemplo: "VALOR: R$200.00" → amount = 200.00

IMPORTANTE: SEMPRE retorne um JSON válido mesmo se a imagem estiver ruim.
Se não conseguir ler algo, use valores padrão razoáveis.

═══════════════════════════════════════════════════
PASSO 3: DETERMINAR TIPO (payment_type)
═══════════════════════════════════════════════════

LÓGICA SIMPLES:
• Se installments > 1 → payment_type = "credito"
• Se installments = 1:
  - Se tem palavra "PIX" → payment_type = "pix_qr"
  - Se tem palavra "DEBITO" → payment_type = "debito"
  - Se tem palavra "CREDITO" → payment_type = "credito"
  - Senão → payment_type = "debito"

EXEMPLOS:
{"amount": 200.00, "installments": 2, "payment_type": "credito"}
{"amount": 280.00, "installments": 3, "payment_type": "credito"}
{"amount": 150.00, "installments": 1, "payment_type": "debito"}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extraia os dados deste comprovante SafraPay. Retorne SEMPRE um JSON válido, mesmo se a imagem estiver ruim.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 300,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Erro na API OpenAI:", errorText)
        throw new Error("Erro ao processar imagem com GPT-4o")
      }

      const data = await response.json()
      const extractedText = data.choices[0].message.content

      if (!extractedText || extractedText === "null" || extractedText.trim() === "") {
        throw new Error("GPT retornou dados vazios")
      }

      return extractedText
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Erro desconhecido")
      console.error(`[v0] Tentativa ${attempt} falhou:`, lastError.message)

      if (attempt < maxRetries) {
        console.log(`[v0] Aguardando antes de tentar novamente...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError || new Error("Falha ao processar comprovante após múltiplas tentativas")
}

export async function readReceiptImage(imageBase64: string): Promise<ReceiptData | null> {
  try {
    console.log("[v0] Processando imagem do comprovante SafraPay...")

    const extractedText = await callOpenAIWithRetry(imageBase64)
    console.log("[v0] Dados extraídos:", extractedText)

    const parsed = JSON.parse(extractedText)

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Formato de dados inválido retornado pelo OCR")
    }

    if (typeof parsed.amount !== "number" || parsed.amount <= 0) {
      throw new Error("Não foi possível identificar o valor no comprovante. Verifique se a imagem está legível.")
    }

    if (typeof parsed.installments !== "number") {
      console.log("[v0] Parcelas não identificadas, usando padrão: 1")
      parsed.installments = 1
    }

    if (!parsed.payment_type) {
      console.log("[v0] Tipo de pagamento não identificado, usando padrão: credito")
      parsed.payment_type = "credito"
    }

    if (parsed.installments < 1) parsed.installments = 1
    if (parsed.installments > 18) {
      console.log(`[v0] AVISO: GPT retornou ${parsed.installments} parcelas, limitando para 18 (máximo permitido)`)
      parsed.installments = 18
    }

    if (parsed.payment_type === "pix_qr" || parsed.payment_type === "debito") {
      if (parsed.installments !== 1) {
        console.log(`[v0] Corrigindo: ${parsed.payment_type} sempre tem 1 parcela`)
        parsed.installments = 1
      }
    }

    if (parsed.installments > 1) {
      if (parsed.payment_type !== "credito") {
        console.log(`[v0] Corrigindo: installments=${parsed.installments}, forçando payment_type para credito`)
        parsed.payment_type = "credito"
      }
    }

    const validated = ReceiptDataSchema.parse(parsed)
    console.log("[v0] Dados validados:", validated)

    return validated
  } catch (error) {
    console.error("[v0] Erro ao ler comprovante SafraPay:", error)
    if (error instanceof Error) {
      throw error
    }
    return null
  }
}
