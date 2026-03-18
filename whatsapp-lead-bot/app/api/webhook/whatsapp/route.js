import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage, markAsRead } from '@/lib/whatsapp'
import { generateBotResponse } from '@/lib/claude'
import { getAvailabilityText } from '@/lib/pos'

// GET: Verificación del webhook
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verificado correctamente')
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
}

// POST: Recibe mensajes de WhatsApp
export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Webhook recibido:', JSON.stringify(body, null, 2))

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages?.[0]) {
      return NextResponse.json({ status: 'no_message' })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]
    const phoneNumber = message.from
    const contactName = contact?.profile?.name || null
    const messageText = message.text?.body || ''
    const businessPhoneId = value.metadata?.phone_number_id || null

    if (message.type !== 'text') {
      await sendWhatsAppMessage(
        phoneNumber,
        'Por el momento solo puedo leer mensajes de texto. ¿Podrías escribirme tu consulta? 😊'
      )
      return NextResponse.json({ status: 'non_text_handled' })
    }

    await markAsRead(message.id).catch(function () {})

    const supabase = createSupabaseAdmin()

    // ==========================================
    // 1. Identificar negocio y sucursal
    // ==========================================
    const { data: branch } = await supabase
      .from('branches')
      .select('*, businesses(*)')
      .eq('whatsapp_number', businessPhoneId)
      .eq('is_active', true)
      .single()

    let business = branch?.businesses
    let activeBranch = branch

    if (!business) {
      const { data: fallbackBusiness } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .single()

      business = fallbackBusiness

      if (!business) {
        console.error('No hay negocio configurado')
        return NextResponse.json({ error: 'No business' }, { status: 500 })
      }

      const { data: fallbackBranch } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      activeBranch = fallbackBranch
    }

    // ==========================================
    // 2. Buscar o crear lead
    // ==========================================
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('business_id', business.id)
      .eq('phone', phoneNumber)
      .single()

    if (!lead) {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          business_id: business.id,
          branch_id: activeBranch?.id || null,
          phone: phoneNumber,
          name: contactName,
          stage: 'nuevo',
          source: 'whatsapp_directo',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creando lead:', error)
        return NextResponse.json({ error: 'Error creating lead' }, { status: 500 })
      }
      lead = newLead
    } else if (contactName && !lead.name) {
      await supabase.from('leads').update({ name: contactName }).eq('id', lead.id)
      lead.name = contactName
    }

    // ==========================================
    // 3. Buscar o crear conversación activa
    // ==========================================
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', lead.id)
      .eq('status', 'activa')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!conversation) {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          business_id: business.id,
          branch_id: activeBranch?.id || null,
          status: 'activa',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creando conversación:', error)
        return NextResponse.json({ error: 'Error creating conversation' }, { status: 500 })
      }
      conversation = newConv
    }

    // ==========================================
    // 4. Guardar mensaje del lead
    // ==========================================
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: 'lead',
      content: messageText,
    })

    // ==========================================
    // 5. Cargar historial de la conversación
    // ==========================================
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20)

    // ==========================================
    // 6. Consultar disponibilidad si el lead quiere agendar
    // ==========================================
    const lastMessage = messageText.toLowerCase()
    const bookingKeywords = ['agendar', 'cita', 'horario', 'disponibilidad', 'día', 'mañana', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'agenda', 'cuando', 'cuándo', 'puedo ir', 'tienen espacio', 'hay lugar']
    const wantsToBook = bookingKeywords.some(function (kw) { return lastMessage.includes(kw) })

    let availabilityInfo = ''
    if (wantsToBook && activeBranch?.name) {
      try {
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dayAfter = new Date(today)
        dayAfter.setDate(dayAfter.getDate() + 2)

        const todayStr = today.toISOString().split('T')[0]
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const dayAfterStr = dayAfter.toISOString().split('T')[0]

        const todayAvail = await getAvailabilityText(activeBranch.name, todayStr)
        const tomorrowAvail = await getAvailabilityText(activeBranch.name, tomorrowStr)
        const dayAfterAvail = await getAvailabilityText(activeBranch.name, dayAfterStr)

        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

        availabilityInfo = '\n\nDISPONIBILIDAD REAL DE AGENDA (' + activeBranch.name + '):'
        availabilityInfo += '\nHOY ' + dias[today.getDay()] + ' (' + todayStr + '): ' + todayAvail
        availabilityInfo += '\nMAÑANA ' + dias[tomorrow.getDay()] + ' (' + tomorrowStr + '): ' + tomorrowAvail
        availabilityInfo += '\nPASADO MAÑANA ' + dias[dayAfter.getDay()] + ' (' + dayAfterStr + '): ' + dayAfterAvail
        availabilityInfo += '\nUsa esta información para ofrecer horarios reales. Si pide otro día, dile que le confirmas con la recepcionista.'

        console.log('Disponibilidad consultada:', availabilityInfo)
      } catch (err) {
        console.error('Error consultando disponibilidad:', err)
      }
    }

    // ==========================================
    // 7. Generar respuesta con Claude
    // ==========================================
    const branchConfig = activeBranch?.config || business.config || {}
    const branchInfo = activeBranch
      ? { sucursal: activeBranch.name, direccion: activeBranch.address, zona: activeBranch.zone }
      : {}

    const { text: botReply, shouldEscalate } = await generateBotResponse(
      business.system_prompt + availabilityInfo,
      history || [],
      { name: lead.name, stage: lead.stage, metadata: { ...lead.metadata, ...branchInfo } },
      branchConfig
    )

    // ==========================================
    // 8. Manejar escalamiento
    // ==========================================
    if (shouldEscalate) {
      await supabase
        .from('conversations')
        .update({ status: 'escalada', escalated_at: new Date().toISOString() })
        .eq('id', conversation.id)

      await supabase
        .from('leads')
        .update({ stage: 'escalado', updated_at: new Date().toISOString() })
        .eq('id', lead.id)

      console.log('⚠️ Lead ' + lead.phone + ' escalado a humano - Sucursal: ' + (activeBranch?.name || 'N/A'))
    }

    // ==========================================
    // 9. Guardar respuesta del bot
    // ==========================================
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: 'bot',
      content: botReply,
    })

    // ==========================================
    // 10. Enviar respuesta por WhatsApp
    // ==========================================
    await sendWhatsAppMessage(phoneNumber, botReply)

    // ==========================================
    // 11. Actualizar etapa del lead
    // ==========================================
    if (lead.stage === 'nuevo' && history && history.length > 2) {
      await supabase
        .from('leads')
        .update({ stage: 'en_conversacion', updated_at: new Date().toISOString() })
        .eq('id', lead.id)
    }

    return NextResponse.json({ status: 'ok', escalated: shouldEscalate })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
