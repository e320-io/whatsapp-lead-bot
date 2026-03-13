// Enviar mensaje de texto por WhatsApp via 360Dialog
export async function sendWhatsAppMessage(to, text) {
  const response = await fetch(`${process.env.DIALOG_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'D360-API-KEY': process.env.DIALOG_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text },
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Error enviando WhatsApp:', data)
    throw new Error(`360Dialog error: ${JSON.stringify(data)}`)
  }

  return data
}

// Marcar mensaje como leído
export async function markAsRead(messageId) {
  await fetch(`${process.env.DIALOG_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'D360-API-KEY': process.env.DIALOG_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })
}
