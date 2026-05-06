import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage, sendWhatsAppImage, markAsRead } from '@/lib/whatsapp'
import { generateBotResponse } from '@/lib/claude'
import { getAvailabilityForDays, createAppointment, getClabeInfo, createPreventaPaquete } from '@/lib/pos'
import { findOrCreateContact, findOrCreateDeal, updateDealStage } from '@/lib/hubspot'

var MAPS_POR_SUCURSAL = {
  'Coapa':   'https://maps.app.goo.gl/9C2enEz7xchp9xen6',
  'Valle':   'https://maps.app.goo.gl/Dp6V3wD4NyfTo8TL6',
  'Polanco': 'https://maps.app.goo.gl/VTFiK9RiGh7Sd5QK6',
  'Metepec': 'https://maps.app.goo.gl/vUPxqhHKa26aRVaDA',
  'Oriente': 'https://maps.app.goo.gl/pqvzsTAh3zEv928R7',
}

// Aliases comunes para detectar sucursal desde texto libre del usuario
var BRANCH_ALIASES = {
  'polanco': 'Polanco',
  'del valle': 'Valle',
  'galerias insurgentes': 'Valle',
  'insurgentes': 'Valle',
  'coapa': 'Coapa',
  'galerias coapa': 'Coapa',
  'oriente': 'Oriente',
  'plaza oriente': 'Oriente',
  'metepec': 'Metepec',
  'estado de mexico': 'Metepec',
  'edomex': 'Metepec',
  'toluca': 'Metepec',
}

function isPreventaPeriod() {
  var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  return now.getFullYear() === 2026 && now.getMonth() === 4 && now.getDate() >= 4 && now.getDate() <= 14
}

function detectBranchByName(text, branches) {
  if (!text || !branches?.length) return null
  var normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (var alias of Object.keys(BRANCH_ALIASES)) {
    if (normalized.includes(alias)) {
      var targetName = BRANCH_ALIASES[alias]
      return branches.find(function (b) { return b.name === targetName }) || null
    }
  }
  // Fallback: comparar directamente contra nombres de sucursales en BD
  for (var branch of branches) {
    var branchNorm = branch.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (normalized.includes(branchNorm)) return branch
  }
  return null
}

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

    // Manejar imagen/documento de comprobante para leads en anticipo_pendiente
    if (message.type === 'image' || message.type === 'document') {
      var supabaseImg = createSupabaseAdmin()
      var dedupImg = await supabaseImg.from('messages').select('id').eq('whatsapp_message_id', message.id).limit(1)
      if (dedupImg.data?.length > 0) return NextResponse.json({ status: 'duplicate' })

      // Buscar lead
      var bizForImg = await supabaseImg.from('businesses').select('*').limit(1).single()
      var leadForImg = bizForImg.data
        ? await supabaseImg.from('leads').select('*').eq('business_id', bizForImg.data.id).eq('phone', phoneNumber).single()
        : { data: null }

      if (leadForImg.data?.stage === 'anticipo_pendiente') {
        // Buscar el pending_appointment para saber si es preventa
        var pendingForImg = await supabaseImg.from('pending_appointments')
          .select('*').eq('lead_id', leadForImg.data.id).eq('status', 'pendiente').single()

        await supabaseImg.from('pending_appointments')
          .update({ status: 'comprobante_recibido' })
          .eq('lead_id', leadForImg.data.id)
          .eq('status', 'pendiente')

        // Guardar mensaje de comprobante
        var convForImg = await supabaseImg.from('conversations').select('id').eq('lead_id', leadForImg.data.id).eq('status', 'activa').order('created_at', { ascending: false }).limit(1).single()
        if (convForImg.data) {
          await supabaseImg.from('messages').insert({
            conversation_id: convForImg.data.id,
            business_id: bizForImg.data.id,
            role: 'lead',
            content: '[Comprobante de transferencia recibido]',
            whatsapp_message_id: message.id,
          })
        }

        var compReply
        // Si es preventa: crear paquete+cita directamente al recibir comprobante
        if (pendingForImg.data?.es_preventa && pendingForImg.data?.precio_total) {
          var pd = pendingForImg.data
          var preventaResult = await createPreventaPaquete({
            sucursal: pd.sucursal,
            fecha: pd.fecha,
            hora: pd.hora,
            servicio: pd.servicio,
            nombre: pd.nombre,
            telefono: pd.phone,
            precio_total: pd.precio_total,
            monto_inicial: pd.monto_anticipo,
          })
          if (preventaResult.success) {
            await supabaseImg.from('leads').update({ stage: 'cita_agendada', updated_at: new Date().toISOString() }).eq('id', leadForImg.data.id)
            var mitad = pd.monto_anticipo
            var pendienteMonto = pd.precio_total - mitad
            compReply = '¡Tu lugar está apartado hermosa! 🎉 Tu cita queda confirmada para el ' + pd.fecha + ' a las ' + pd.hora + ' en ' + pd.sucursal + ' ✨\n\nRecuerda que el saldo pendiente de $' + pendienteMonto + ' lo liquidas del 15 al 30 de mayo 💖'
          } else {
            console.error('Error creando preventa desde comprobante:', preventaResult.error)
            await supabaseImg.from('leads').update({ stage: 'escalado', updated_at: new Date().toISOString() }).eq('id', leadForImg.data.id)
            await supabaseImg.from('conversations').update({ status: 'escalada', escalated_at: new Date().toISOString() }).eq('id', convForImg.data?.id)
            compReply = '¡Recibimos tu comprobante! ✨ En breve una asesora te confirma tu lugar 💖'
          }
        } else {
          // Flujo regular: escalar para verificación manual
          await supabaseImg.from('conversations').update({ status: 'escalada', escalated_at: new Date().toISOString() }).eq('id', convForImg.data?.id)
          await supabaseImg.from('leads').update({ stage: 'escalado', updated_at: new Date().toISOString() }).eq('id', leadForImg.data.id)
          compReply = '¡Recibimos tu comprobante! ✨ En breve una de nuestras asesoras lo verifica y te confirma tu cita 💖 Gracias por tu paciencia hermosa.'
        }

        if (convForImg.data) {
          await supabaseImg.from('messages').insert({ conversation_id: convForImg.data.id, business_id: bizForImg.data.id, role: 'bot', content: compReply })
        }
        await sendWhatsAppMessage(phoneNumber, compReply)
        return NextResponse.json({ status: 'comprobante_recibido' })
      }

      await sendWhatsAppMessage(phoneNumber, 'Por el momento solo puedo leer mensajes de texto. ¿Podrías escribirme tu consulta? 😊')
      return NextResponse.json({ status: 'non_text_handled' })
    }

    if (message.type !== 'text') {
      await sendWhatsAppMessage(phoneNumber, 'Por el momento solo puedo leer mensajes de texto. ¿Podrías escribirme tu consulta? 😊')
      return NextResponse.json({ status: 'non_text_handled' })
    }

    await markAsRead(message.id).catch(function () {})

    // Deduplicación: ignorar si ya procesamos este message.id de WhatsApp
    var supabaseDedup = createSupabaseAdmin()
    var dedupResult = await supabaseDedup
      .from('messages')
      .select('id')
      .eq('whatsapp_message_id', message.id)
      .limit(1)
    if (dedupResult.data && dedupResult.data.length > 0) {
      console.log('Mensaje duplicado ignorado:', message.id)
      return NextResponse.json({ status: 'duplicate' })
    }

    var supabase = supabaseDedup

    // 1. Identificar negocio y sucursal
    var branchResult = await supabase
      .from('branches').select('*, businesses(*)').eq('whatsapp_number', businessPhoneId).eq('is_active', true).single()

    var business = branchResult.data?.businesses
    // El match por número solo identifica el negocio, no confirma sucursal para el lead.
    // La sucursal debe ser elegida explícitamente (keyword, nombre en mensaje, o elección guardada).
    var activeBranch = null
    var branchConfirmed = false

    if (!business) {
      var bizResult = await supabase.from('businesses').select('*').limit(1).single()
      business = bizResult.data
      if (!business) return NextResponse.json({ error: 'No business' }, { status: 500 })
      // En modo centralizado el fallback NO confirma sucursal — Claude debe preguntarla
      activeBranch = null
      branchConfirmed = false
    }

    // 1b. Detectar sucursal por keyword o por nombre en el mensaje
    var cleanedMessageText = messageText
    var keywordBranchDetected = false
    var lowerMsgForKeyword = messageText.toLowerCase().trim()
    var allBranchesResult = await supabase
      .from('branches').select('*').eq('business_id', business.id).eq('is_active', true)
    var allBranches = allBranchesResult.data || []

    // Primero intentar por keyword de campaña (mensaje prellenado de Meta Ads)
    for (var kb of allBranches) {
      if (kb.keyword && lowerMsgForKeyword.includes(kb.keyword.toLowerCase())) {
        activeBranch = kb
        keywordBranchDetected = true
        branchConfirmed = true
        cleanedMessageText = messageText.replace(new RegExp(kb.keyword, 'gi'), '').trim()
        if (!cleanedMessageText) cleanedMessageText = ''
        console.log('Sucursal detectada por keyword:', kb.name, '| Mensaje limpio:', cleanedMessageText || '(vacío)')
        break
      }
    }

    // Si no hay keyword, intentar detectar por nombre de sucursal en el texto
    if (!keywordBranchDetected) {
      var detectedByName = detectBranchByName(messageText, allBranches)
      if (detectedByName) {
        activeBranch = detectedByName
        keywordBranchDetected = true
        branchConfirmed = true
        console.log('Sucursal detectada por nombre en mensaje:', detectedByName.name)
      }
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
    } else {
      // El lead respondió: actualizar nombre si faltaba y resetear contadores de seguimiento
      var hadFollowUps = lead.metadata?.follow_up_count > 0
      var stageReset = lead.stage === 'escalado' ? { stage: 'en_conversacion' } : {}
      var leadUpdates = {
        ...stageReset,
        metadata: Object.assign({}, lead.metadata || {}, {
          follow_up_count: 0,
          last_follow_up_at: null,
          follow_up_type: null,
        }),
      }
      if (contactName && !lead.name) leadUpdates.name = contactName
      // Si se detectó una keyword, persistir la sucursal en el lead
      if (keywordBranchDetected && activeBranch?.id && lead.branch_id !== activeBranch.id) {
        leadUpdates.branch_id = activeBranch.id
        console.log('Actualizando branch_id del lead a:', activeBranch.name)
      }
      await supabase.from('leads').update(leadUpdates).eq('id', lead.id)
      if (stageReset.stage) lead.stage = stageReset.stage
      if (contactName && !lead.name) lead.name = contactName
      if (leadUpdates.branch_id) lead.branch_id = leadUpdates.branch_id
      if (hadFollowUps) lead.metadata = Object.assign({}, lead.metadata, { follow_up_count: 0, last_follow_up_at: null })
    }

    // Si no se detectó por texto pero el lead ya eligió sucursal antes → usarla (confirmada)
    if (!keywordBranchDetected && lead.branch_id) {
      var savedBranchResult = await supabase.from('branches').select('*').eq('id', lead.branch_id).single()
      if (savedBranchResult.data) {
        activeBranch = savedBranchResult.data
        branchConfirmed = true
        console.log('Sucursal recuperada del lead:', activeBranch.name)
      }
    }

    if (!branchConfirmed) {
      console.log('Sucursal no confirmada — Claude preguntará antes de agendar')
    }

    // Sincronizar con HubSpot (no bloquea el flujo si falla)
    var hubspotContactId = lead.metadata?.hubspot_contact_id || null
    var hubspotDealId = lead.metadata?.hubspot_deal_id || null
    try {
      if (!hubspotContactId) {
        hubspotContactId = await findOrCreateContact({ phone: phoneNumber, name: lead.name })
      }
      if (!hubspotDealId) {
        hubspotDealId = await findOrCreateDeal({
          contactId: hubspotContactId,
          phone: phoneNumber,
          name: lead.name,
          stage: lead.stage,
        })
      }
      if (hubspotContactId !== lead.metadata?.hubspot_contact_id || hubspotDealId !== lead.metadata?.hubspot_deal_id) {
        await supabase.from('leads').update({
          metadata: Object.assign({}, lead.metadata || {}, {
            hubspot_contact_id: hubspotContactId,
            hubspot_deal_id: hubspotDealId,
          })
        }).eq('id', lead.id)
      }
    } catch (hsErr) {
      console.error('HubSpot sync error:', hsErr.message)
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

    // 4. Guardar mensaje (sin la keyword de sucursal si fue detectada)
    var savedMessageContent = cleanedMessageText || messageText
    await supabase.from('messages').insert({
      conversation_id: conversation.id, business_id: business.id, role: 'lead', content: savedMessageContent,
      whatsapp_message_id: message.id
    })

    // Si una recepcionista tomó el control, guardar mensaje y no responder con bot
    if (conversation.bot_paused) {
      console.log('Bot pausado para lead', lead.phone, '- mensaje guardado, recepcionista atiende')
      return NextResponse.json({ status: 'bot_paused' })
    }

    // 5. Cargar historial
    var historyResult = await supabase.from('messages').select('role, content').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(20)
    var history = historyResult.data || []

    // 6. Consultar disponibilidad si quiere agendar
    var lowerMsg = savedMessageContent.toLowerCase()
    var bookingWords = ['agendar', 'cita', 'horario', 'disponibilidad', 'día', 'mañana', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'agenda', 'cuando', 'cuándo', 'puedo ir', 'hay lugar', 'tienen espacio', 'quiero ir', 'sesión', 'sesion']
    var wantsToBook = bookingWords.some(function (kw) { return lowerMsg.includes(kw) })

    // Si el mensaje es corto (confirmación como "sip", "ok", "dale"), revisar si el historial reciente tiene contexto de agendamiento
    if (!wantsToBook && savedMessageContent.length < 30) {
      var recentBotMessages = history.filter(function (m) { return m.role === 'bot' }).slice(-3)
      var botBookingContext = recentBotMessages.some(function (m) {
        var c = (m.content || '').toLowerCase()
        return bookingWords.some(function (kw) { return c.includes(kw) }) || c.includes('horario') || c.includes('disponib')
      })
      if (botBookingContext) wantsToBook = true
    }

    var availabilityInfo = ''
    if (wantsToBook && !activeBranch) {
      availabilityInfo = '\n\nATENCIÓN — SUCURSAL NO CONFIRMADA: El lead quiere agendar pero aún NO ha elegido sucursal. DEBES preguntar cuál sucursal le queda más cerca ANTES de ofrecer cualquier horario. Usa exactamente: "¡Perfecto! 💖 Llevamos 9 años siendo pioneras en depilación láser con 5 sucursales en CDMX y Metepec ✨ Tenemos en: Polanco, Del Valle, Coapa, Oriente y Metepec 🙌 ¿Cuál te queda más cerca?" — NUNCA inventes horarios ni menciones una sucursal específica sin que el lead la haya elegido.'
    }
    if (wantsToBook && activeBranch?.name) {
      try {
        var avail = await getAvailabilityForDays(activeBranch.name, 14)

        var todayMx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
        var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
        var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        var todayStr = todayMx.getFullYear() + '-' + String(todayMx.getMonth() + 1).padStart(2, '0') + '-' + String(todayMx.getDate()).padStart(2, '0')
        var todayNatural = dias[todayMx.getDay()] + ' ' + todayMx.getDate() + ' de ' + meses[todayMx.getMonth()] + ' de ' + todayMx.getFullYear()

        var firstAvailDate = avail.match(/\d{4}-\d{2}-\d{2}/)
        var exampleDate = firstAvailDate ? firstAvailDate[0] : todayStr
        availabilityInfo = '\n\nFECHA DE HOY: ' + todayStr + ' (' + todayNatural + ')'
        availabilityInfo += '\nDISPONIBILIDAD REAL DE AGENDA (' + activeBranch.name + ') - próximos 14 días:\n' + avail
        availabilityInfo += '\n\nINSTRUCCIONES DE AGENDAMIENTO:'
        availabilityInfo += '\n- Ofrece 2-3 horarios específicos del día que pida el prospecto.'
        availabilityInfo += '\n- CRÍTICO: Usa ÚNICAMENTE las fechas en formato YYYY-MM-DD que aparecen en la lista de arriba. CÓPIALAS exactamente, no las reformatees ni calcules fechas tú mismo.'
        if (isPreventaPeriod()) {
          availabilityInfo += '\n- ESTAMOS EN PREVENTA HOT SALE (4–14 mayo). Cuando confirme horario, usa el tag:'
          availabilityInfo += '\n  [SOLICITAR_PREVENTA|fecha|hora|servicio|nombre|precio_total]'
          availabilityInfo += '\n  Ejemplo: [SOLICITAR_PREVENTA|' + exampleDate + '|11:00|Full Body|María López|8500]'
          availabilityInfo += '\n- precio_total es el precio Hot Sale del servicio elegido (el total completo, no la mitad).'
          availabilityInfo += '\n- La fecha DEBE ser copiada tal cual de la lista (YYYY-MM-DD). La hora DEBE ser formato HH:MM.'
          availabilityInfo += '\n- Después del tag escribe: "Para apartar tu lugar de la Preventa Hot Sale 🔥 te pido el 50% ahora: $[precio/2] ✨ La otra mitad la liquidas del 15 al 30 de mayo. Ahora te comparto los datos para la transferencia 💖 Una vez que la realices, mándanos tu comprobante y confirmamos tu lugar."'
          availabilityInfo += '\n- CRÍTICO: El lugar queda confirmado HASTA que recibamos el comprobante. NUNCA digas "tu cita está confirmada" antes de eso.'
        } else {
          availabilityInfo += '\n- Cuando confirme horario, incluye en tu respuesta el tag:'
          availabilityInfo += '\n  [SOLICITAR_ANTICIPO|fecha|hora|servicio|nombre]'
          availabilityInfo += '\n  Ejemplo: [SOLICITAR_ANTICIPO|' + exampleDate + '|11:00|Combo Axilas|María López]'
          availabilityInfo += '\n- La fecha DEBE ser copiada tal cual de la lista (YYYY-MM-DD). La hora DEBE ser formato HH:MM.'
          availabilityInfo += '\n- El servicio debe ser el que el prospecto eligió en la conversación.'
          availabilityInfo += '\n- Después del tag escribe: "Para apartar tu lugar te pido un anticipo de $200 que se descuenta el día de tu sesión ✨ Ahora te comparto los datos para la transferencia 💖 Una vez que la realices, mándanos tu comprobante y confirmamos tu cita."'
          availabilityInfo += '\n- CRÍTICO: La cita queda confirmada HASTA que recibamos el comprobante. NUNCA digas "tu cita está confirmada" antes de eso.'
        }
        availabilityInfo += '\n- NO preguntes si es valoración o tratamiento. Asume primera sesión del servicio que eligió.'
        availabilityInfo += '\n- Si no tienes el nombre del prospecto, PÍDELO antes de agendar.'

        console.log('Disponibilidad consultada para ' + activeBranch.name + ':', avail.substring(0, 200))
      } catch (err) {
        console.error('Error consultando disponibilidad:', err)
      }
    }

    // 7. Generar respuesta con Claude
    var branchConfig = activeBranch?.config || business.config || {}
    // Solo pasar sucursal a Claude si fue confirmada explícitamente (no fallback)
    var branchInfo = (activeBranch && branchConfirmed)
      ? { sucursal: activeBranch.name, direccion: activeBranch.address, zona: activeBranch.zone }
      : {}

    // Si el mensaje es solo una keyword de Meta Ads (vacío después de limpiar) Y es conversación nueva → trigger de saludo
    // Si hay historial previo, el lead está eligiendo sucursal en conversación — NO reiniciar
    var effectiveHistory = history
    if (keywordBranchDetected && !cleanedMessageText && history.length <= 1) {
      effectiveHistory = [{ role: 'lead', content: 'Hola' }]
    }

    var botResult = await generateBotResponse(
      business.system_prompt,
      effectiveHistory,
      { name: lead.name, phone: lead.phone, stage: lead.stage, metadata: Object.assign({}, lead.metadata || {}, branchInfo) },
      branchConfig,
      availabilityInfo,
      allBranches
    )

    var botReply = botResult.text
    var shouldEscalate = botResult.shouldEscalate

    // 8a. Detectar solicitud de anticipo
    var anticipoMatch = botReply.match(/\[SOLICITAR_ANTICIPO\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (anticipoMatch) {
      var pendingData = {
        lead_id: lead.id,
        phone: phoneNumber,
        nombre: anticipoMatch[4].trim(),
        servicio: anticipoMatch[3].trim(),
        fecha: anticipoMatch[1].trim(),
        hora: anticipoMatch[2].trim(),
        sucursal: activeBranch?.name || null,
        monto_anticipo: 200,
        status: 'pendiente',
      }

      await supabase.from('pending_appointments').insert(pendingData)
      await supabase.from('leads').update({ stage: 'anticipo_pendiente', updated_at: new Date().toISOString() }).eq('id', lead.id)

      botReply = botReply.replace(/\[SOLICITAR_ANTICIPO\|[^\]]+\]/g, '').trim()

      // Enviar datos bancarios en mensaje separado
      var clabeInfo = getClabeInfo(activeBranch?.name)
      if (clabeInfo) {
        var sucursalMapsUrl = MAPS_POR_SUCURSAL[activeBranch?.name]
        var clabeMsg = '💳 *Datos para transferencia — CIRE ' + activeBranch.name + '*\n\n'
          + '🏦 Banco: ' + clabeInfo.banco + '\n'
          + '👤 Titular: ' + clabeInfo.titular + '\n'
          + '🔢 No. Cuenta: ' + clabeInfo.cuenta + '\n'
          + '🔢 CLABE: ' + clabeInfo.clabe + '\n'
          + (clabeInfo.tarjeta ? '💳 No. Tarjeta: ' + clabeInfo.tarjeta + '\n' : '')
          + '💰 Monto: $200\n\n'
          + '📌 *En el concepto escribe:* ' + clabeInfo.concepto + '\n\n'
          + 'Manda foto o captura de pantalla de tu comprobante aquí mismo ✨'
          + (sucursalMapsUrl ? '\n\n📍 *Ubicación CIRE ' + activeBranch.name + ':*\n' + sucursalMapsUrl : '')
        // Se envía después del mensaje principal
        setTimeout(async function() {
          await sendWhatsAppMessage(phoneNumber, clabeMsg)
        }, 1500)
      }
    }

    // 8a2. Detectar solicitud de preventa Hot Sale
    var preventaMatch = botReply.match(/\[SOLICITAR_PREVENTA\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (preventaMatch) {
      var precioTotal = parseInt(preventaMatch[5].trim()) || 0
      var montoInicial = Math.round(precioTotal / 2)
      var pendingPreventaData = {
        lead_id: lead.id,
        phone: phoneNumber,
        nombre: preventaMatch[4].trim(),
        servicio: preventaMatch[3].trim(),
        fecha: preventaMatch[1].trim(),
        hora: preventaMatch[2].trim(),
        sucursal: activeBranch?.name || null,
        precio_total: precioTotal,
        monto_anticipo: montoInicial,
        es_preventa: true,
        status: 'pendiente',
      }

      await supabase.from('pending_appointments').insert(pendingPreventaData)
      await supabase.from('leads').update({ stage: 'anticipo_pendiente', updated_at: new Date().toISOString() }).eq('id', lead.id)

      botReply = botReply.replace(/\[SOLICITAR_PREVENTA\|[^\]]+\]/g, '').trim()

      // Enviar datos bancarios con el monto del 50%
      var clabePreventa = getClabeInfo(activeBranch?.name)
      if (clabePreventa) {
        var sucursalMapsUrlPreventa = MAPS_POR_SUCURSAL[activeBranch?.name]
        var clabeMsgPreventa = '💳 *Datos para transferencia — CIRE ' + activeBranch.name + '*\n\n'
          + '🏦 Banco: ' + clabePreventa.banco + '\n'
          + '👤 Titular: ' + clabePreventa.titular + '\n'
          + '🔢 No. Cuenta: ' + clabePreventa.cuenta + '\n'
          + '🔢 CLABE: ' + clabePreventa.clabe + '\n'
          + (clabePreventa.tarjeta ? '💳 No. Tarjeta: ' + clabePreventa.tarjeta + '\n' : '')
          + '💰 Monto (50%): $' + montoInicial + '\n\n'
          + '📌 *En el concepto escribe:* ' + clabePreventa.concepto + '\n\n'
          + 'Manda foto o captura de pantalla de tu comprobante aquí mismo ✨'
          + (sucursalMapsUrlPreventa ? '\n\n📍 *Ubicación CIRE ' + activeBranch.name + ':*\n' + sucursalMapsUrlPreventa : '')
        setTimeout(async function() {
          await sendWhatsAppMessage(phoneNumber, clabeMsgPreventa)
        }, 1500)
      }
    }

    // 8b. Detectar y ejecutar creación de cita (flujo legacy sin anticipo)
    var citaMatch = botReply.match(/\[CREAR_CITA\|([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/)
    if (citaMatch) {
      var citaData = {
        fecha: citaMatch[1].trim(),
        hora: citaMatch[2].trim(),
        servicio: citaMatch[3].trim(),
        nombre: citaMatch[4].trim(),
        sucursal: activeBranch?.name,
        telefono: phoneNumber
      }

      console.log('Creando cita:', JSON.stringify(citaData))
      var citaResult = await createAppointment(citaData)

      if (citaResult.success) {
        console.log('CITA CREADA EXITOSAMENTE - ID:', citaResult.cita?.id)
        await supabase.from('leads').update({ stage: 'cita_agendada', updated_at: new Date().toISOString() }).eq('id', lead.id)
        if (hubspotDealId) updateDealStage(hubspotDealId, 'cita_agendada').catch((e) => console.error('HubSpot stage update:', e.message))
      } else {
        console.error('ERROR CREANDO CITA:', citaResult.error)
        if (citaResult.error && citaResult.error.includes('no está disponible')) {
          try {
            var altSlots = await getAvailableSlots(citaData.sucursal, citaData.fecha)
            if (altSlots.length > 0) {
              botReply = 'Ese horario acaba de ser tomado 😅 Los horarios disponibles para ese día son: ' + altSlots.join(', ') + ' ¿Cuál te funciona mejor? 💖'
            } else {
              botReply = 'Ese horario acaba de ser tomado 😅 Ya no hay disponibilidad para ese día. ¿Te funciona otro día? 💖'
            }
          } catch (e) {
            botReply = 'Ese horario acaba de ser tomado 😅 ¿Quieres que revisemos otro horario? 💖'
          }
        } else {
          botReply = botReply + '\n\n(Hubo un problema al agendar, una asesora te confirmará en breve)'
          shouldEscalate = true
        }
      }

      botReply = botReply.replace(/\[CREAR_CITA\|[^\]]+\]/g, '').trim()
    }

    // 9. Manejar escalamiento
    if (shouldEscalate) {
      await supabase.from('conversations').update({ status: 'escalada', escalated_at: new Date().toISOString() }).eq('id', conversation.id)
      await supabase.from('leads').update({ stage: 'escalado', updated_at: new Date().toISOString() }).eq('id', lead.id)
      if (hubspotDealId) updateDealStage(hubspotDealId, 'escalado').catch((e) => console.error('HubSpot stage update:', e.message))
      console.log('⚠️ Lead ' + lead.phone + ' escalado - Sucursal: ' + (activeBranch?.name || 'N/A'))
    }

    // 10. Guardar y enviar respuesta
    await supabase.from('messages').insert({
      conversation_id: conversation.id, business_id: business.id, role: 'bot', content: botReply
    })
    await sendWhatsAppMessage(phoneNumber, botReply)

    // 10c. Enviar imagen automática si el contexto lo requiere (solo una vez por conversación)
    var appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    if (appUrl) {
      var replyLower = botReply.toLowerCase()
      var bikiniKeywords = ['bikini', 'bikini básico', 'sexy bikini', 'french bikini', 'brazilian', 'zona íntima', 'zona intima']
      var mentionsBikini = bikiniKeywords.some(function(kw) { return replyLower.includes(kw) })
      if (mentionsBikini) {
        var bikiniImageAlreadySent = history.some(function(m) {
          return m.role === 'bot' && bikiniKeywords.some(function(kw) { return (m.content || '').toLowerCase().includes(kw) })
        })
        if (!bikiniImageAlreadySent) {
          setTimeout(async function() {
            try {
              await sendWhatsAppImage(phoneNumber, appUrl + '/images/Bikini-hotsale.jpeg')
            } catch(e) {
              console.error('Error enviando imagen bikini:', e.message)
            }
          }, 1000)
        }
      }
    }

    // 11. Actualizar etapa
    if (lead.stage === 'nuevo' && history.length > 2) {
      await supabase.from('leads').update({ stage: 'en_conversacion', updated_at: new Date().toISOString() }).eq('id', lead.id)
      if (hubspotDealId) updateDealStage(hubspotDealId, 'en_conversacion').catch((e) => console.error('HubSpot stage update:', e.message))
    }

    return NextResponse.json({ status: 'ok', escalated: shouldEscalate })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
