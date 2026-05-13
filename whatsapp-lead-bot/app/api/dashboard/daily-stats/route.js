import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    let businessId = searchParams.get('business_id')

    if (!businessId) {
      const { data: biz } = await supabase.from('businesses').select('id').limit(1).single()
      if (!biz) return NextResponse.json({ error: 'No business' }, { status: 404 })
      businessId = biz.id
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Conversaciones atendidas hoy (creadas hoy)
    const { count: conversacionesHoy } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', todayISO)

    // Leads asignados por sucursal hoy
    const { data: leadsHoy } = await supabase
      .from('leads')
      .select('branch_id, branches(name)')
      .eq('business_id', businessId)
      .gte('created_at', todayISO)

    const leadsByBranchHoy = {}
    leadsHoy?.forEach((l) => {
      const name = l.branches?.name || 'Sin sucursal'
      leadsByBranchHoy[name] = (leadsByBranchHoy[name] || 0) + 1
    })

    // Leads esperando que el equipo los tome para agendar
    // notificacion_sucursal = bot mandó alerta, esperando_respuesta = movido manualmente al kanban
    const { count: esperandoContacto } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('stage', ['notificacion_sucursal', 'esperando_respuesta'])

    // Alertas enviadas a sucursales hoy (leads que pasaron a notificacion_sucursal hoy)
    const { count: alertasSucursalHoy } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('stage', ['notificacion_sucursal', 'esperando_respuesta'])
      .gte('updated_at', todayISO)

    return NextResponse.json({
      conversacionesHoy: conversacionesHoy || 0,
      leadsByBranchHoy,
      esperandoContacto: esperandoContacto || 0,
      alertasSucursalHoy: alertasSucursalHoy || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
