import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage, sendWhatsAppImage } from '@/lib/whatsapp'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request) {
  try {
    const { leadId, conversationId, message, imageUrl } = await request.json()
    if (!leadId || !conversationId || (!message?.trim() && !imageUrl)) {
      return NextResponse.json({ error: 'leadId, conversationId y message o imageUrl son requeridos' }, { status: 400, headers: CORS })
    }

    const supabase = createSupabaseAdmin()

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('phone, business_id')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) throw new Error('Lead no encontrado')

    // Pausar el bot permanentemente cuando el asesor envía cualquier mensaje
    await supabase
      .from('conversations')
      .update({ bot_paused: true })
      .eq('id', conversationId)

    if (message?.trim()) {
      let waResult
      try {
        waResult = await sendWhatsAppMessage(lead.phone, message.trim())
      } catch (waErr) {
        const errStr = waErr.message || ''
        // Código 131047 = outside 24-hour customer-initiated window
        const is24hBlock = errStr.includes('131047') || errStr.includes('outside the allowed window')
        return NextResponse.json({
          error: is24hBlock
            ? 'El lead no ha escrito en las últimas 24 horas — WhatsApp bloquea mensajes salientes hasta que él/ella escriba primero. Pídele por otro medio que te mande un mensaje.'
            : 'Error de WhatsApp al enviar: ' + errStr,
          whatsapp_error: true,
          window_expired: is24hBlock,
        }, { status: 422, headers: CORS })
      }
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        business_id: lead.business_id,
        role: 'bot',
        content: message.trim(),
        is_human_agent: true,
        whatsapp_message_id: waResult?.messages?.[0]?.id || null,
      })
    }

    if (imageUrl) {
      let waResult
      try {
        waResult = await sendWhatsAppImage(lead.phone, imageUrl)
      } catch (waErr) {
        const errStr = waErr.message || ''
        const is24hBlock = errStr.includes('131047') || errStr.includes('outside the allowed window')
        return NextResponse.json({
          error: is24hBlock
            ? 'El lead no ha escrito en las últimas 24 horas — WhatsApp bloquea mensajes salientes hasta que él/ella escriba primero. Pídele por otro medio que te mande un mensaje.'
            : 'Error de WhatsApp al enviar imagen: ' + errStr,
          whatsapp_error: true,
          window_expired: is24hBlock,
        }, { status: 422, headers: CORS })
      }
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        business_id: lead.business_id,
        role: 'bot',
        content: '[Imagen enviada: ' + imageUrl.split('/').pop() + ']',
        is_human_agent: true,
        whatsapp_message_id: waResult?.messages?.[0]?.id || null,
      })
    }

    return NextResponse.json({ success: true }, { headers: CORS })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }
}
