import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { createAppointmentWithAnticipo } from '@/lib/pos'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { updateDealStage } from '@/lib/hubspot'

var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fechaNatural(fechaStr, horaStr) {
  var parts = fechaStr.split('-')
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' a las ' + horaStr
}

export async function POST(request) {
  try {
    var body = await request.json()
    var { pendingId } = body
    if (!pendingId) return NextResponse.json({ error: 'Falta pendingId' }, { status: 400 })

    var supabase = createSupabaseAdmin()

    // Obtener el pending appointment
    var pendingResult = await supabase
      .from('pending_appointments')
      .select('*, leads(*)')
      .eq('id', pendingId)
      .single()

    if (pendingResult.error || !pendingResult.data) {
      return NextResponse.json({ error: 'Anticipo pendiente no encontrado' }, { status: 404 })
    }

    var pending = pendingResult.data
    var lead = pending.leads

    if (pending.status === 'confirmado') {
      return NextResponse.json({ error: 'Este anticipo ya fue confirmado' }, { status: 400 })
    }

    // Crear cita en el POS con anticipo
    var citaResult = await createAppointmentWithAnticipo({
      fecha: pending.fecha,
      hora: pending.hora,
      servicio: pending.servicio,
      nombre: pending.nombre,
      sucursal: pending.sucursal,
      telefono: pending.phone,
    })

    if (!citaResult.success) {
      return NextResponse.json({ error: 'Error creando cita en POS: ' + citaResult.error }, { status: 500 })
    }

    // Actualizar pending_appointment a confirmado
    await supabase.from('pending_appointments')
      .update({ status: 'confirmado' })
      .eq('id', pendingId)

    // Actualizar etapa del lead
    await supabase.from('leads')
      .update({ stage: 'cita_agendada', updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    // Reactivar conversación
    await supabase.from('conversations')
      .update({ status: 'activa' })
      .eq('lead_id', lead.id)
      .eq('status', 'escalada')

    // Actualizar HubSpot si hay deal
    var hubspotDealId = lead.metadata?.hubspot_deal_id
    if (hubspotDealId) {
      updateDealStage(hubspotDealId, 'cita_agendada').catch((e) => console.error('HubSpot:', e.message))
    }

    // Enviar confirmación por WhatsApp
    var fechaHumana = fechaNatural(pending.fecha, pending.hora)
    var confirmMsg = '¡Todo listo hermosa! 🎉 Tu anticipo fue confirmado y tu cita quedó agendada ✨\n\n'
      + '📅 ' + fechaHumana + '\n'
      + '📍 CIRE ' + pending.sucursal + '\n\n'
      + 'Te recomendamos llegar 10 minutitos antes 💖\n\n'
      + '💎 PREPARACIÓN PARA TU SESIÓN ✨\n'
      + '🪒 Rasura la zona con anticipación. El vello debe estar al ras de la piel.\n'
      + '🧼 Piel limpia: sin crema, loción, desodorante ni maquillaje en la zona.\n\n'
      + '¡Estamos emocionadas de verte! 💖'

    await sendWhatsAppMessage(pending.phone, confirmMsg)

    // Guardar mensaje de confirmación en historial
    var convResult = await supabase.from('conversations')
      .select('id, business_id')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (convResult.data) {
      await supabase.from('messages').insert({
        conversation_id: convResult.data.id,
        business_id: convResult.data.business_id,
        role: 'bot',
        content: confirmMsg,
      })
    }

    console.log('Anticipo confirmado y cita creada para lead:', lead.id, '| Cita POS:', citaResult.cita?.id)
    return NextResponse.json({ success: true, cita: citaResult.cita })
  } catch (error) {
    console.error('Error confirmando anticipo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
