import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request) {
  try {
    const { leadId, conversationId, message } = await request.json()
    if (!leadId || !conversationId || !message?.trim()) {
      return NextResponse.json({ error: 'leadId, conversationId y message son requeridos' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('phone, business_id')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) throw new Error('Lead no encontrado')

    await sendWhatsAppMessage(lead.phone, message.trim())

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      business_id: lead.business_id,
      role: 'bot',
      content: message.trim(),
      is_human_agent: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
