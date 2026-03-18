const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/**
 * Enviar mensaje de texto por WhatsApp via Meta Cloud API
 * @param {string} to - Número del destinatario (formato internacional sin +)
 * @param {string} text - Texto del mensaje
 */
export async function sendWhatsAppMessage(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  const response = await fetch(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Error enviando WhatsApp:', data)
    throw new Error(`Meta API error: ${JSON.stringify(data)}`)
  }

  return data
}

/**
 * Marcar mensaje como leído
 * @param {string} messageId - ID del mensaje a marcar
 */
export async function markAsRead(messageId) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch((err) => console.error('Error marcando como leído:', err))
}
