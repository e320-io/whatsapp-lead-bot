import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from './system-prompt.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateBotResponse(_systemPrompt, messageHistory, leadInfo, branchConfig, availabilityInfo, allBranches) {
  const branchInfo = leadInfo.metadata?.sucursal
    ? `\nSUCURSAL DEL LEAD: ${leadInfo.metadata.sucursal}` +
      (leadInfo.metadata.direccion ? `\nDirección confirmada (USAR EXACTAMENTE ESTA, NO INVENTAR OTRA): ${leadInfo.metadata.direccion}` : '') +
      (leadInfo.metadata.zona ? `\nZona: ${leadInfo.metadata.zona}` : '') +
      (leadInfo.metadata.maps_url ? `\nLink Maps (OBLIGATORIO incluirlo al dar la dirección, en línea propia como URL pura): ${leadInfo.metadata.maps_url}` : '')
    : ''

  // Lista de sucursales para el system prompt (siempre disponible para contexto)
  const branchesList = allBranches?.length
    ? '\nSUCURSALES DISPONIBLES: ' + allBranches.map(b => b.name + (b.address ? ` — ${b.address}` : '')).join(' | ')
    : ''

  const fullSystemPrompt = `${SYSTEM_PROMPT}
${branchInfo}${branchesList}
INFORMACIÓN DEL PROSPECTO:
- Nombre: ${leadInfo.name || 'No proporcionado aún'}
- Teléfono WhatsApp: ${leadInfo.phone} (ya lo tienes, NO se lo pidas al cliente)
- Etapa: ${leadInfo.stage || 'nuevo'}
- Datos recopilados: ${JSON.stringify(leadInfo.metadata || {})}

REGLAS DE DATOS AL AGENDAR:
- El teléfono ya está capturado de WhatsApp, NUNCA se lo pidas al cliente.
- El nombre solo pídelo si no aparece arriba. Úsalo para personalizar la cita, no para "buscar en el sistema".
- Todos los leads son nuevos clientes, no busques historial en ningún sistema.
${availabilityInfo || ''}`

  const messages = messageHistory.map((msg) => ({
    role: msg.role === 'lead' ? 'user' : 'assistant',
    content: msg.content,
  }))

  // Si el historial empieza con un mensaje del bot (ej. seguimiento proactivo), recortar
  // hasta el primer mensaje del lead para que la API de Claude reciba un array válido
  while (messages.length > 0 && messages[0].role === 'assistant') {
    messages.shift()
  }

  if (messages.length === 0) {
    const sucursal = leadInfo.metadata?.sucursal
    const greeting = sucursal
      ? `¡Hola${leadInfo.name ? ` ${leadInfo.name}` : ''}! ✨ Soy la asistente de CIRE ${sucursal} 💖 Llevamos 9 años siendo pioneras en depilación láser, faciales y tratamientos corporales ✨ Cuéntame, ¿qué te gustaría mejorar?`
      : `¡Hola${leadInfo.name ? ` ${leadInfo.name}` : ''}! ✨ Soy la asistente de CIRE 💖 Somos especialistas en depilación láser, faciales y tratamientos corporales — 9 años de experiencia, 5 sucursales ✨ Cuéntame, ¿qué te gustaría mejorar?`
    return { text: greeting, shouldEscalate: false }
  }

  // Usa Sonnet solo cuando se detectan tags de acción en el historial reciente
  const lastMessages = messageHistory.slice(-5).map(m => m.content || '').join(' ').toLowerCase()
  const hasActionTags = lastMessages.includes('crear_cita') || lastMessages.includes('solicitar_anticipo') || lastMessages.includes('solicitar_preventa')
  const model = hasActionTags ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: fullSystemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages,
    })

    const botReply = response.content[0].text
    const shouldEscalate = botReply.includes('[ESCALAR_A_HUMANO]')

    return {
      text: botReply.replace('[ESCALAR_A_HUMANO]', '').trim(),
      shouldEscalate,
    }
  } catch (error) {
    console.error('Error con Claude API - mensaje:', error.message)
    console.error('Error con Claude API - status:', error.status)
    console.error('Error con Claude API - completo:', JSON.stringify(error, null, 2))
    return {
      text: '¡Gracias por escribirnos! En este momento estoy teniendo dificultades técnicas. Una de nuestras asesoras te contactará en breve. 🙏',
      shouldEscalate: true,
    }
  }
}
