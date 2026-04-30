import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request, { params }) {
  try {
    const supabase = createSupabaseAdmin()
    const { id } = params

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at, whatsapp_message_id')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
