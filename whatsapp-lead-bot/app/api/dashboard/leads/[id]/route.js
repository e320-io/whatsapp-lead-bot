import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request, { params }) {
  try {
    const supabase = createSupabaseAdmin()
    const { id } = await params

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, status, created_at, bot_paused')
      .eq('lead_id', id)
      .order('created_at', { ascending: true })

    if (convError) throw convError

    const convIds = conversations?.map((c) => c.id) || []

    if (convIds.length === 0) return NextResponse.json({ messages: [], conversations: [] })

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at, is_human_agent')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    return NextResponse.json({
      messages: messages || [],
      conversations: conversations || [],
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = createSupabaseAdmin()
    const { error } = await supabase
      .from('leads')
      .update({ label: body.label ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
