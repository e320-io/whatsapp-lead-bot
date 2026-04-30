import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    // Traer todos los leads con su última conversación y último mensaje
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        phone,
        stage,
        source,
        created_at,
        branches ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    // Para cada lead, traer su última conversación y último mensaje
    const leadIds = leads.map((l) => l.id)

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, lead_id, status, created_at, escalated_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })

    // Agrupar conversaciones por lead (quedarse con la más reciente)
    const lastConvByLead = {}
    const allConvIdsByLead = {}
    conversations?.forEach((c) => {
      if (!lastConvByLead[c.lead_id]) lastConvByLead[c.lead_id] = c
      if (!allConvIdsByLead[c.lead_id]) allConvIdsByLead[c.lead_id] = []
      allConvIdsByLead[c.lead_id].push(c.id)
    })

    // Último mensaje de cada lead (across all conversations)
    const allConvIds = conversations?.map((c) => c.id) || []
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, content, role, created_at')
      .in('conversation_id', allConvIds)
      .order('created_at', { ascending: false })

    // Mapear último mensaje por lead
    const lastMsgByLead = {}
    lastMsgs?.forEach((m) => {
      const conv = conversations?.find((c) => c.id === m.conversation_id)
      if (conv && !lastMsgByLead[conv.lead_id]) {
        lastMsgByLead[conv.lead_id] = m
      }
    })

    const result = leads.map((lead) => ({
      ...lead,
      last_conversation: lastConvByLead[lead.id] || null,
      conversation_count: allConvIdsByLead[lead.id]?.length || 0,
      last_message: lastMsgByLead[lead.id] || null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
