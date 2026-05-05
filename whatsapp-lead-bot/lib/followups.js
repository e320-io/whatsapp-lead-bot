import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from './system-prompt.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Horas desde la referencia para cada intento de seguimiento
const FOLLOWUP_THRESHOLDS_HOURS = {
  never_responded: [12, 24, 72],   // 12h, 24h, 3 días
  went_silent:     [6,  24, 72],   // 6h,  24h, 3 días
}

// 10 días en horas
const NO_INTERESADO_THRESHOLD_HOURS = 240

export function classifyLead(messages) {
  const leadMessages = messages.filter((m) => m.role === 'lead')
  const botMessages  = messages.filter((m) => m.role === 'bot')

  if (botMessages.length === 0) return null // El bot nunca habló, no hay nada que seguir

  const type = leadMessages.length === 0 ? 'never_responded' : 'went_silent'

  // Referencia: para never_responded = primer mensaje del bot; para went_silent = último mensaje del lead
  const referenceAt = type === 'never_responded'
    ? new Date(botMessages[0].created_at)
    : new Date(leadMessages[leadMessages.length - 1].created_at)

  return { type, referenceAt }
}

export function shouldSendFollowUp(classification, followUpCount, lastFollowUpAt) {
  if (!classification) return null

  const { type, referenceAt } = classification
  const now = new Date()
  const hoursSinceReference = (now - referenceAt) / (1000 * 60 * 60)

  // Marcar como no interesado después de 10 días
  if (hoursSinceReference >= NO_INTERESADO_THRESHOLD_HOURS) {
    return { action: 'no_interesado' }
  }

  const thresholds = FOLLOWUP_THRESHOLDS_HOURS[type]
  if (followUpCount >= thresholds.length) return null // Ya se enviaron todos los seguimientos

  // Cooldown mínimo de 4h entre seguimientos para evitar duplicados por reinicios del cron
  if (lastFollowUpAt) {
    const hoursSinceLastFU = (now - new Date(lastFollowUpAt)) / (1000 * 60 * 60)
    if (hoursSinceLastFU < 4) return null
  }

  const threshold = thresholds[followUpCount]
  if (hoursSinceReference >= threshold) {
    return { action: 'send_followup', followUpNumber: followUpCount + 1, type }
  }

  return null
}

export async function generateFollowUpMessage(lead, messages, followUpNumber, followUpType) {
  const isLastFollowUp = followUpNumber === 3

  const contextLines = messages
    .slice(-10)
    .map((m) => `${m.role === 'lead' ? 'Lead' : 'Bot'}: ${m.content}`)
    .join('\n')

  const typeInstruction = followUpType === 'never_responded'
    ? `El lead NUNCA respondió al primer mensaje del bot. Este es el seguimiento #${followUpNumber}.`
    : `El lead respondió antes pero dejó de contestar. Este es el seguimiento #${followUpNumber}.`

  const closingInstruction = isLastFollowUp
    ? 'Es el ÚLTIMO seguimiento (cierre suave). Di algo como "Cierro tu seguimiento por ahora, cuando quieras aquí estoy ✨" — breve y sin presión.'
    : 'Envía un mensaje corto y cálido para reactivar la conversación. Sin presionar. Pregunta algo concreto o recuerda el beneficio principal.'

  const prompt = followUpType === 'never_responded' || messages.length < 3
    ? `Nombre del lead: ${lead.name || 'hermosa'}\n\nEste lead nunca respondió. Escribe un mensaje corto de reactivación (máx 2 oraciones) como lo haría la asistente virtual de CIRE. ${closingInstruction}`
    : `Conversación previa:\n${contextLines}\n\n${typeInstruction}\n\n${closingInstruction}\n\nNombre del lead: ${lead.name || 'hermosa'}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].text.replace('[ESCALAR_A_HUMANO]', '').trim()
}
