import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .order('label', { ascending: true })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { label, emoji = '', color = '#6b7280' } = body
    if (!label?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

    const key = label.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('labels')
      .insert({ key, label: label.trim(), emoji: emoji.trim(), color })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
