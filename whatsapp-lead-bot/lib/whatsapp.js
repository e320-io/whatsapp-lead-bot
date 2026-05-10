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
 * Enviar imagen por WhatsApp via Meta Cloud API
 * @param {string} to - Número de teléfono destino
 * @param {string} imageUrl - URL pública de la imagen
 * @param {string} [caption] - Texto opcional que acompaña la imagen
 */
export async function sendWhatsAppImage(to, imageUrl, caption = '') {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  const numbersToTry = [normalizePhoneNumber(to)]
  if (normalizePhoneNumber(to) !== to) {
    numbersToTry.push(to)
  }

  let lastError = null

  for (const number of numbersToTry) {
    const imagePayload = { link: imageUrl }
    if (caption) imagePayload.caption = caption

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
          type: 'image',
          image: imagePayload,
        }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      console.log('Imagen enviada exitosamente a:', number)
      return data
    }

    console.error('Error enviando imagen a ' + number + ':', data)
    lastError = data
  }

  throw new Error('Meta API error (imagen): ' + JSON.stringify(lastError))
}

/**
 * Descarga un archivo multimedia de WhatsApp y lo sube a Supabase Storage.
 * Devuelve la URL pública o null si falla.
 * @param {string} mediaId - ID del media en WhatsApp
 * @param {string} mimeType - MIME type del archivo (image/jpeg, application/pdf, etc.)
 * @param {object} supabase - Cliente de Supabase admin
 */
export async function downloadAndStoreWhatsAppMedia(mediaId, mimeType, supabase) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  try {
    // 1. Obtener la URL de descarga autenticada desde Meta
    const metaRes = await fetch(`${GRAPH_API_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!metaRes.ok) throw new Error('No se pudo obtener URL del media: ' + metaRes.status)
    const metaData = await metaRes.json()
    const downloadUrl = metaData.url
    if (!downloadUrl) throw new Error('Meta no devolvió URL de descarga')

    // 2. Descargar los bytes del archivo
    const fileRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!fileRes.ok) throw new Error('No se pudo descargar el archivo: ' + fileRes.status)
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 3. Determinar extensión
    const extMap = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'application/pdf': 'pdf',
    }
    const ext = extMap[mimeType] || 'bin'
    const fileName = `comprobantes/${Date.now()}_${mediaId}.${ext}`

    // 4. Subir a Supabase Storage (bucket: chat-images)
    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error('Error subiendo a Supabase Storage: ' + uploadError.message)

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName)
    return urlData?.publicUrl || null
  } catch (err) {
    console.error('Error en downloadAndStoreWhatsAppMedia:', err.message)
    return null
  }
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
