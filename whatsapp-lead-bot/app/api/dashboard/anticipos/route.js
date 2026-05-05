import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    var supabase = createSupabaseAdmin()

    var result = await supabase
      .from('pending_appointments')
      .select('*, leads(name, phone, stage, branches(name))')
      .in('status', ['pendiente', 'comprobante_recibido'])
      .order('created_at', { ascending: false })

    if (result.error) throw new Error(result.error.message)

    return NextResponse.json(result.data || [])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
