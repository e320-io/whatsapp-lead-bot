import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        created_at,
        escalated_at,
        leads (
          id,
          name,
          phone,
          stage,
          source
        ),
        branches (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    // Para cada conversación traer el último mensaje
    const convIds = data.map((c) => c.id)
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, content, role, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMsgMap = {}
    lastMsgs?.forEach((m) => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m
    })

    const result = data.map((c) => ({
      ...c,
      last_message: lastMsgMap[c.id] || null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
