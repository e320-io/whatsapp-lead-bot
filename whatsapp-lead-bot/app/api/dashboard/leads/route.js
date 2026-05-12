import { NextResponse } from 'next/server'
import { supabaseAdminFetch } from '@/lib/supabase'

export async function GET() {
  try {
    const leads = await supabaseAdminFetch(
      'leads?select=id,name,phone,stage,label,source,created_at,branch_id,branches(name)&order=created_at.desc&limit=200'
    )

    if (!Array.isArray(leads)) throw new Error(leads?.message || 'Error fetching leads')

    const leadIds = leads.map(l => l.id)
    if (!leadIds.length) return NextResponse.json([])

    const conversations = await supabaseAdminFetch(
      `conversations?select=id,lead_id,status,created_at,escalated_at,bot_paused&lead_id=in.(${leadIds.join(',')})&order=created_at.desc`
    )

    const lastConvByLead = {}
    const allConvIdsByLead = {}
    conversations?.forEach?.((c) => {
      if (!lastConvByLead[c.lead_id]) lastConvByLead[c.lead_id] = c
      if (!allConvIdsByLead[c.lead_id]) allConvIdsByLead[c.lead_id] = []
      allConvIdsByLead[c.lead_id].push(c.id)
    })

    const allConvIds = conversations?.map?.(c => c.id) || []
    let lastMsgs = []
    if (allConvIds.length) {
      lastMsgs = await supabaseAdminFetch(
        `messages?select=conversation_id,content,role,created_at,is_human_agent&conversation_id=in.(${allConvIds.join(',')})&order=created_at.desc`
      )
    }

    const lastMsgByLead = {}
    const firstMsgByLead = {}
    const msgsByLead = {}
    lastMsgs?.forEach?.((m) => {
      const conv = conversations?.find(c => c.id === m.conversation_id)
      if (!conv) return
      if (!lastMsgByLead[conv.lead_id]) lastMsgByLead[conv.lead_id] = m
      firstMsgByLead[conv.lead_id] = m // always overwrite → desc order → last value is oldest
      if (!msgsByLead[conv.lead_id]) msgsByLead[conv.lead_id] = []
      msgsByLead[conv.lead_id].push(m)
    })

    const unreadByLead = {}
    Object.keys(msgsByLead).forEach(leadId => {
      const conv = lastConvByLead[leadId]
      if (!conv?.bot_paused) return
      const msgs = msgsByLead[leadId] // newest first (desc order)
      const lastBotIdx = msgs.findIndex(m => m.role === 'bot')
      unreadByLead[leadId] = lastBotIdx === -1
        ? msgs.filter(m => m.role === 'lead').length
        : msgs.slice(0, lastBotIdx).filter(m => m.role === 'lead').length
    })

    const result = leads.map(lead => ({
      ...lead,
      last_conversation: lastConvByLead[lead.id] || null,
      conversation_count: allConvIdsByLead[lead.id]?.length || 0,
      last_message: lastMsgByLead[lead.id] || null,
      first_message: firstMsgByLead[lead.id] || null,
      bot_paused: lastConvByLead[lead.id]?.bot_paused || false,
      unread_count: unreadByLead[lead.id] || 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
