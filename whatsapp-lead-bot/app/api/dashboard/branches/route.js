import { NextResponse } from 'next/server'
import { supabaseAdminFetch } from '@/lib/supabase'

export async function GET() {
  try {
    const data = await supabaseAdminFetch(
      'branches?select=id,name,keyword,zone,address,is_active&order=name.asc'
    )
    if (!Array.isArray(data)) throw new Error(data?.message || 'Error fetching branches')
    return NextResponse.json(data.filter(b => b.is_active !== false))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
