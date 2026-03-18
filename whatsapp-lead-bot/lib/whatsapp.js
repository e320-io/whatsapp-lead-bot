const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/**
 * Normalizar números mexicanos: WhatsApp envía 521XXXXXXXXXX
 * pero Meta a veces los registra como 52XXXXXXXXXX (sin el 1)
 */
function normalizePhoneNumber(phone) {
  if (phone.startsWith('521') && phone.length === 13) {
    return '52' + phone.slice(3)
  }
  return phone
}

/**
 * Enviar mensaje de texto por WhatsApp via Meta Cloud API
 * Intenta con formato normalizado (52XX) y si falla, con el original (521XX)
 */
export async function sendWhatsAppMessage(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  const numbersToTry = [normalizePhoneNumber(to)]
  if (normalizePhoneNumber(to) !== to) {
    numbersToTry.push(to)
  }

  let lastError = null

  for (const number of numbersToTry) {
    console.log('Intentando enviar a:', number)
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
          to: number,
          type: 'text',
          text: { body: text },
        }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      console.log('Mensaje enviado exitosamente a:', number)
      return data
    }

    console.error('Error enviando a ' + number + ':', data)
    lastError = data
  }

  throw new Error('Meta API error: ' + JSON.stringify(lastError))
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
