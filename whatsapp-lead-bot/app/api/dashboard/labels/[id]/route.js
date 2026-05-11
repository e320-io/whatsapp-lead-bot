import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()
    const { error } = await supabase.from('labels').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
