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
        `messages?select=conversation_id,content,role,created_at&conversation_id=in.(${allConvIds.join(',')})&order=created_at.desc`
      )
    }

    const lastMsgByLead = {}
    lastMsgs?.forEach?.((m) => {
      const conv = conversations?.find(c => c.id === m.conversation_id)
      if (conv && !lastMsgByLead[conv.lead_id]) lastMsgByLead[conv.lead_id] = m
    })

    const result = leads.map(lead => ({
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
