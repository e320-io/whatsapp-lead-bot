import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { conversationId, paused } = await request.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId requerido' }, { status: 400 })

    const supabase = createSupabaseAdmin()
    const { error } = await supabase
      .from('conversations')
      .update({ bot_paused: paused })
      .eq('id', conversationId)

    if (error) throw error

    return NextResponse.json({ success: true, bot_paused: paused })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
