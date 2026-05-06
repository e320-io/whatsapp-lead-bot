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

    if (message?.trim()) {
      await sendWhatsAppMessage(lead.phone, message.trim())
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        business_id: lead.business_id,
        role: 'bot',
        content: message.trim(),
        is_human_agent: true,
      })
    }

    if (imageUrl) {
      await sendWhatsAppImage(lead.phone, imageUrl)
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        business_id: lead.business_id,
        role: 'bot',
        content: '[Imagen enviada: ' + imageUrl.split('/').pop() + ']',
        is_human_agent: true,
      })
    }

    return NextResponse.json({ success: true }, { headers: CORS })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }
}
