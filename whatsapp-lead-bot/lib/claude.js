import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Genera respuesta del bot usando Claude API
 * @param {string} systemPrompt - Instrucciones del negocio
 * @param {Array} messageHistory - [{role, content}]
 * @param {object} leadInfo - {name, stage, metadata}
 * @param {object} branchConfig - Config de la sucursal (horarios, servicios)
 */
export async function generateBotResponse(systemPrompt, messageHistory, leadInfo, branchConfig) {
  const branchInfo = leadInfo.metadata?.sucursal
    ? `\nSUCURSAL DEL LEAD: ${leadInfo.metadata.sucursal}${leadInfo.metadata.direccion ? ` (${leadInfo.metadata.direccion})` : ''}${leadInfo.metadata.zona ? ` - Zona: ${leadInfo.metadata.zona}` : ''}`
    : ''

  const fullSystemPrompt = `${systemPrompt}
${branchInfo}
INFORMACIÓN DEL NEGOCIO:
- Servicios: ${branchConfig.servicios?.join(', ') || 'Depilación láser'}
- Horarios: ${branchConfig.horarios || 'Lunes a Viernes 10:00-19:00, Sábados 10:00-14:00'}

INFORMACIÓN DEL PROSPECTO:
- Nombre: ${leadInfo.name || 'No proporcionado aún'}
- Etapa: ${leadInfo.stage || 'nuevo'}
- Datos recopilados: ${JSON.stringify(leadInfo.metadata || {})}

REGLAS:
1. Primera vez que escribe → bienvenida cálida, pregunta en qué le puedes ayudar.
2. Recopila de forma natural: zona del cuerpo, si es primera vez, interés en agendar.
3. Siempre empuja hacia agendar una valoración gratuita.
4. Si pide hablar con persona, tiene queja, o quiere comprar ya → responde: [ESCALAR_A_HUMANO] y un mensaje amable diciendo que lo conectas con alguien.
5. Máximo 3-4 oraciones por mensaje. Sé conciso.
6. Español informal profesional (tuteo mexicano).
7. Máximo 1-2 emojis por mensaje.
8. Si ya tienes la info, ofrece agendar directamente.
9. NO inventes precios ni promociones que no conozcas.
10. Si preguntan precio, di que en la valoración gratuita les dan toda la información personalizada.`

  // Convertir historial al formato Claude API
  const messages = messageHistory.map((msg) => ({
    role: msg.role === 'lead' ? 'user' : 'assistant',
    content: msg.content,
  }))

  // Asegurar que el primer mensaje sea del user
  if (messages.length === 0 || messages[0].role !== 'user') {
    return {
      text: `¡Hola${leadInfo.name ? ` ${leadInfo.name}` : ''}! 👋 Bienvenid@ a CIRE${leadInfo.metadata?.sucursal ? ` ${leadInfo.metadata.sucursal}` : ''}. ¿En qué te puedo ayudar? Si te interesa la depilación láser, con gusto te platico cómo funciona.`,
      shouldEscalate: false,
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
