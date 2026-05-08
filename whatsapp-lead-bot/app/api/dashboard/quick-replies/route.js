import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('quick_replies')
      .select('id, shortcut, content, image_url, created_at')
      .order('shortcut', { ascending: true })
    if (error) throw error
    return NextResponse.json(data, { headers: CORS })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }
}

export async function POST(request) {
  try {
    const { shortcut, content, image_url } = await request.json()
    if (!shortcut?.trim() || (!content?.trim() && !image_url)) {
      return NextResponse.json({ error: 'shortcut y content o image_url son requeridos' }, { status: 400, headers: CORS })
    }
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('quick_replies')
      .insert({
        shortcut: shortcut.trim().toLowerCase().replace(/\s+/g, ''),
        content: content?.trim() || null,
        image_url: image_url || null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201, headers: CORS })
  } catch (error) {
    const msg = error.code === '23505' ? 'Ya existe un atajo con ese nombre' : error.message
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS })
  }
}
