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
    const updateData = { updated_at: new Date().toISOString() }

    // Handle multi-label toggle: { addLabel: 'key' } or { removeLabel: 'key' }
    if (body.addLabel !== undefined) {
      await supabase.from('lead_labels').upsert({ lead_id: id, label_key: body.addLabel }, { onConflict: 'lead_id,label_key' })
      return NextResponse.json({ ok: true })
    }
    if (body.removeLabel !== undefined) {
      await supabase.from('lead_labels').delete().eq('lead_id', id).eq('label_key', body.removeLabel)
      return NextResponse.json({ ok: true })
    }

    if (body.stage !== undefined) updateData.stage = body.stage
    const { error } = await supabase.from('leads').update(updateData).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
