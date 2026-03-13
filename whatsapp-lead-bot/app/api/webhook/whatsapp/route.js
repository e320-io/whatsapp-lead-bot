import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage, markAsRead } from '@/lib/whatsapp'
import { generateBotResponse } from '@/lib/claude'

// GET: Verificación del webhook (360Dialog envía GET para validar)
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

    // Extraer mensaje del payload de 360Dialog / Meta
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    // Ignorar si no es un mensaje
    if (!value?.messages?.[0]) {
      return NextResponse.json({ status: 'no_message' })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]
    const phoneNumber = message.from
    const contactName = contact?.profile?.name || null
    const messageText = message.text?.body || ''
    const businessPhoneId = value.metadata?.phone_number_id || null

    // Solo procesamos mensajes de texto por ahora
    if (message.type !== 'text') {
      await sendWhatsAppMessage(
        phoneNumber,
        'Por el momento solo puedo leer mensajes de texto. ¿Podrías escribirme tu consulta? 😊'
      )
      return NextResponse.json({ status: 'non_text_handled' })
    }

    // Marcar como leído
    await markAsRead(message.id).catch(() => {})

    const supabase = createSupabaseAdmin()

    // ==========================================
    // 1. Identificar negocio y sucursal por número de WhatsApp
    // ==========================================
    const { data: branch } = await supabase
      .from('branches')
      .select('*, businesses(*)')
      .eq('whatsapp_number', businessPhoneId)
      .eq('is_active', true)
      .single()

    // Si no encontramos por número, buscar el negocio principal (modo desarrollo)
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

      // Buscar sucursal activa del negocio
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
      .limit(20) // últimos 20 mensajes para contexto

    // ==========================================
    // 6. Generar respuesta con Claude
    // ==========================================
    const branchConfig = activeBranch?.config || business.config || {}
    const branchInfo = activeBranch
      ? { sucursal: activeBranch.name, direccion: activeBranch.address, zona: activeBranch.zone }
      : {}

    const { text: botReply, shouldEscalate } = await generateBotResponse(
      business.system_prompt,
      history || [],
      { name: lead.name, stage: lead.stage, metadata: { ...lead.metadata, ...branchInfo } },
      branchConfig
    )

    // ==========================================
    // 7. Manejar escalamiento
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

      // TODO: Notificar a recepcionista (email, SMS, o webhook)
      console.log(`⚠️ Lead ${lead.phone} escalado a humano - Sucursal: ${activeBranch?.name}`)
    }

    // ==========================================
    // 8. Guardar respuesta del bot
    // ==========================================
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: 'bot',
      content: botReply,
    })

    // ==========================================
    // 9. Enviar respuesta por WhatsApp
    // ==========================================
    await sendWhatsAppMessage(phoneNumber, botReply)

    // ==========================================
    // 10. Actualizar etapa del lead si es nuevo
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
