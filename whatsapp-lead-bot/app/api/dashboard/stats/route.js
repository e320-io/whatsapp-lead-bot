import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      // Si no viene business_id, usar el primero
      const { data: biz } = await supabase.from('businesses').select('id').limit(1).single()
      if (!biz) return NextResponse.json({ error: 'No business' }, { status: 404 })
      return getStats(supabase, biz.id)
    }

    return getStats(supabase, businessId)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getStats(supabase, businessId) {
  // Total de leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  // Leads por etapa
  const { data: leadsByStage } = await supabase
    .from('leads')
    .select('stage')
    .eq('business_id', businessId)

  const stageCounts = {}
  leadsByStage?.forEach((l) => {
    stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1
  })

  // Leads de hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: leadsToday } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', today.toISOString())

  // Conversaciones escaladas
  const { count: escalated } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'escalada')

  // Leads por sucursal
  const { data: leadsByBranch } = await supabase
    .from('leads')
    .select('branch_id, branches(name)')
    .eq('business_id', businessId)

  const branchCounts = {}
  leadsByBranch?.forEach((l) => {
    const branchName = l.branches?.name || 'Sin sucursal'
    branchCounts[branchName] = (branchCounts[branchName] || 0) + 1
  })

  // Total de mensajes
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  return NextResponse.json({
    totalLeads: totalLeads || 0,
    leadsToday: leadsToday || 0,
    leadsByStage: stageCounts,
    leadsByBranch: branchCounts,
    escalated: escalated || 0,
    totalMessages: totalMessages || 0,
  })
}
