import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()
    const { error } = await supabase.from('quick_replies').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true }, { headers: CORS })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  }
}
