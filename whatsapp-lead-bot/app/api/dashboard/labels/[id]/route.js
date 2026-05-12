import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { label, emoji, color } = body
    const supabase = createSupabaseAdmin()
    const update = {}
    if (label !== undefined) update.label = label.trim()
    if (emoji !== undefined) update.emoji = emoji.trim()
    if (color !== undefined) update.color = color
    const { data, error } = await supabase
      .from('labels')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
