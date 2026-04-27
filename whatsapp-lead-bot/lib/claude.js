import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from './system-prompt.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateBotResponse(_systemPrompt, messageHistory, leadInfo, branchConfig) {
  const branchInfo = leadInfo.metadata?.sucursal
    ? `\nSUCURSAL DEL LEAD: ${leadInfo.metadata.sucursal}${leadInfo.metadata.direccion ? ` (${leadInfo.metadata.direccion})` : ''}${leadInfo.metadata.zona ? ` - Zona: ${leadInfo.metadata.zona}` : ''}`
    : ''

  const fullSystemPrompt = `${SYSTEM_PROMPT}
${branchInfo}
INFORMACIÓN DEL PROSPECTO:
- Nombre: ${leadInfo.name || 'No proporcionado aún'}
- Etapa: ${leadInfo.stage || 'nuevo'}
- Datos recopilados: ${JSON.stringify(leadInfo.metadata || {})}`

  const messages = messageHistory.map((msg) => ({
    role: msg.role === 'lead' ? 'user' : 'assistant',
    content: msg.content,
  }))

  if (messages.length === 0 || messages[0].role !== 'user') {
    return {
      text: `¡Hola${leadInfo.name ? ` ${leadInfo.name}` : ''}! 👋 Bienvenid@ a CIRE${leadInfo.metadata?.sucursal ? ` ${leadInfo.metadata.sucursal}` : ''}. Soy la asistente virtual de CIRE. ¿Cómo te llamas? Y platícame, ¿qué servicio te interesa?`,
      shouldEscalate: false,
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: fullSystemPrompt,
      messages: messages,
    })

    const botReply = response.content[0].text
    const shouldEscalate = botReply.includes('[ESCALAR_A_HUMANO]')

    return {
      text: botReply.replace('[ESCALAR_A_HUMANO]', '').trim(),
      shouldEscalate,
    }
  } catch (error) {
    console.error('Error con Claude API:', error)
    return {
      text: '¡Gracias por escribirnos! En este momento estoy teniendo dificultades técnicas. Una de nuestras asesoras te contactará en breve. 🙏',
      shouldEscalate: true,
    }
  }
}
