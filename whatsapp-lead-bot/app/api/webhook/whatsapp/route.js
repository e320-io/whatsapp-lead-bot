import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage, markAsRead } from '@/lib/whatsapp'
import { generateBotResponse } from '@/lib/claude'
import { getAvailabilityForDays, createAppointment } from '@/lib/pos'

export async function GET(request) {
  var url = new URL(request.url)
  var mode = url.searchParams.get('hub.mode')
  var token = url.searchParams.get('hub.verify_token')
  var challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
}

export async function POST(request) {
  try {
    var body = await request.json()
    console.log('Webhook recibido:', JSON.stringify(body, null, 2))

    var entry = body.entry?.[0]
    var changes = entry?.changes?.[0]
    var value = changes?.value

    if (!value?.messages?.[0]) {
      return NextResponse.json({ status: 'no_message' })
    }

    var message = value.messages[0]
    var contact = value.contacts?.[0]
    var phoneNumber = message.from
    var contactName = contact?.profile?.name || null
    var messageText = message.text?.body || ''
    var businessPhoneId = value.metadata?.phone_number_id || null

    if (message.type !== 'text') {
      await sendWhatsAppMessage(phoneNumber, 'Por el momento solo puedo leer mensajes de texto. ¿Podrías escribirme tu consulta? 😊')
      return NextResponse.json({ status: 'non_text_handled' })
    }

    await markAsRead(message.id).catch(function () {})

    var supabase = createSupabaseAdmin()

    // 1. Identificar negocio y sucursal
    var branchResult = await supabase
      .from('branches').select('*, businesses(*)').eq('whatsapp_number', businessPhoneId).eq('is_active', true).single()

    var business = branchResult.data?.businesses
    var activeBranch = branchResult.data

    if (!business) {
      var bizResult = await supabase.from('businesses').select('*').limit(1).single()
      business = bizResult.data
      if (!business) return NextResponse.json({ error: 'No business' }, { status: 500 })

      var brFallback = await supabase.from('branches').select('*').eq('business_id', business.id).eq('is_active', true).limit(1).single()
      activeBranch = brFallback.data
    }

    // 2. Buscar o crear lead
    var leadResult = await supabase.from('leads').select('*').eq('business_id', business.id).eq('phone', phoneNumber).single()
    var lead = leadResult.data

    if (!lead) {
      var newLeadResult = await supabase.from('leads').insert({
        business_id: business.id, branch_id: activeBranch?.id || null,
        phone: phoneNumber, name: contactName, stage: 'nuevo', source: 'whatsapp_directo'
      }).select().single()
      if (newLeadResult.error) return NextResponse.json({ error: 'Error creating lead' }, { status: 500 })
      lead = newLeadResult.data
    } else if (contactName && !lead.name) {
      await supabase.from('leads').update({ name: contactName }).eq('id', lead.id)
      lead.name = contactName
    }

    // 3. Buscar o crear conversación
    var convResult = await supabase.from('conversations').select('*').eq('lead_id', lead.id).eq('status', 'activa').order('created_at', { ascending: false }).limit(1).single()
    var conversation = convResult.data

    if (!conversation) {
      var newConvResult = await supabase.from('conversations').insert({
        lead_id: lead.id, business_id: business.id, branch_id: activeBranch?.id || null, status: 'activa'
      }).select().single()
      if (newConvResult.error) return NextResponse.json({ error: 'Error creating conversation' }, { status: 500 })
      conversation = newConvResult.data
    }

    // 4. Guardar mensaje
    await supabase.from('messages').insert({
      conversation_id: conversation.id, business_id: business.id, role: 'lead', content: messageText
    })

    // 5. Cargar historial
    var historyResult = await supabase.from('messages').select('role, content').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(20)
    var history = historyResult.data || []

    // 6. Consultar disponibilidad si quiere agendar
    var lowerMsg = messageText.toLowerCase()
    var bookingWords = ['agendar', 'cita', 'horario', 'disponibilidad', 'día', 'mañana', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'agenda', 'cuando', 'cuándo', 'puedo ir', 'hay lugar', 'tienen espacio', 'quiero ir', 'sesión', 'sesion']
    var wantsToBook = bookingWords.some(function (kw) { return lowerMsg.includes(kw) })

    var availabilityInfo = ''
    if (wantsToBook && activeBranch?.name) {
      try {
        var avail = await getAvailabilityForDays(activeBranch.name, 14)
        availabilityInfo = '\n\nDISPONIBILIDAD REAL DE AGENDA (' + activeBranch.name + ') - próximos 14 días:\n' + avail
        availabilityInfo += '\n\nINSTRUCCIONES DE AGENDAMIENTO:'
        availabilityInfo += '\n- Ofrece 2-3 horarios específicos del día que pida el prospecto.'
        availabilityInfo += '\n- Cuando confirme horario, responde EXACTAMENTE con este formato en tu mensaje:'
        availabilityInfo += '\n  [CREAR_CITA|fecha|hora|servicio|nombre]'
        availabilityInfo += '\n  Ejemplo: [CREAR_CITA|2026-03-25|11:00|Primera sesión depilación láser|María López]'
        availabilityInfo += '\n- Además del código, escribe un mensaje bonito confirmando la cita.'
        availabilityInfo += '\n- Si pide un día sin disponibilidad, ofrece el día más cercano que sí tenga.'
        availabilityInfo += '\n- NO preguntes si es valoración o tratamiento. Asume primera sesión del servicio que le interesó en la conversación.'
      } catch (err) {
        console.error('Error consultando disponibilidad:', err)
      }
    }

    // 7. Generar respuesta con Claude
    var branchConfig = activeBranch?.config || business.config || {}
    var branchInfo = activeBranch ? { sucursal: activeBranch.name, direccion: activeBranch.address, zona: activeBranch.zone } : {}

    var botResult = await generateBotResponse(
      business.system_prompt + availabilityInfo,
      history,
      { name: lead.name, stage: lead.stage, metadata: Object.assign({}, lead.metadata || {}, branchInfo) },
      branchConfig
    )

    var botReply = botResult.text
    var shouldEscalate = botResult.shouldEscalate

    // 8. Detectar y ejecutar creación de cita
    var citaMatch = botReply.match(/\[CREAR_CITA\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (citaMatch) {
      var citaData = {
        fecha: citaMatch[1],
        hora: citaMatch[2],
        servicio: citaMatch[3],
        nombre: citaMatch[4],
        sucursal: activeBranch?.name || 'Polanco',
        telefono: phoneNumber
      }

      console.log('Creando cita:', citaData)
      var citaResult = await createAppointment(citaData)

      if (citaResult.success) {
        console.log('Cita creada exitosamente:', citaResult.cita?.id)
        await supabase.from('leads').update({ stage: 'cita_agendada', updated_at: new Date().toISOString() }).eq('id', lead.id)
      } else {
        console.error('Error creando cita:', citaResult.error)
        botReply = botReply + '\n\n(Hubo un problema al agendar, una asesora te confirmará en breve)'
        shouldEscalate = true
      }

      // Quitar el código de la respuesta visible
      botReply = botReply.replace(/\[CREAR_CITA\|[^\]]+\]/g, '').trim()
    }

    // 9. Manejar escalamiento
    if (shouldEscalate) {
      await supabase.from('conversations').update({ status: 'escalada', escalated_at: new Date().toISOString() }).eq('id', conversation.id)
      await supabase.from('leads').update({ stage: 'escalado', updated_at: new Date().toISOString() }).eq('id', lead.id)
      console.log('⚠️ Lead ' + lead.phone + ' escalado - Sucursal: ' + (activeBranch?.name || 'N/A'))
    }

    // 10. Guardar y enviar respuesta
    await supabase.from('messages').insert({
      conversation_id: conversation.id, business_id: business.id, role: 'bot', content: botReply
    })
    await sendWhatsAppMessage(phoneNumber, botReply)

    // 11. Actualizar etapa
    if (lead.stage === 'nuevo' && history.length > 2) {
      await supabase.from('leads').update({ stage: 'en_conversacion', updated_at: new Date().toISOString() }).eq('id', lead.id)
    }

    return NextResponse.json({ status: 'ok', escalated: shouldEscalate })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
