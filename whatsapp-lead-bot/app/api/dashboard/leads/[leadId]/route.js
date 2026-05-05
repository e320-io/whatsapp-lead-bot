import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// Todos los mensajes de un lead, across todas sus conversaciones
export async function GET(request, { params }) {
  try {
    const supabase = createSupabaseAdmin()
    const { leadId } = params

    // Traer todas las conversaciones del lead
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, status, created_at, bot_paused')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })

    if (convError) throw convError

    const convIds = conversations?.map((c) => c.id) || []

    if (convIds.length === 0) return NextResponse.json([])

    // Traer todos los mensajes de esas conversaciones
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at, is_human_agent')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    // Añadir marca de inicio de conversación para separar visualmente
    const convMap = {}
    conversations?.forEach((c) => { convMap[c.id] = c })

    return NextResponse.json({
      messages: messages || [],
      conversations: conversations || [],
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
