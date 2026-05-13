import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { updateDealStage } from '@/lib/hubspot'
import { classifyLead, shouldSendFollowUp, generateFollowUpMessage } from '@/lib/followups'

// Proteger el endpoint con un secret para que solo Vercel Cron pueda llamarlo
function isAuthorized(request) {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

// Devuelve la hora actual en CDMX (0-23)
function getHourCDMX() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  ).getHours()
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  const results = { processed: 0, followups_sent: 0, no_interesado: 0, errors: [] }

  // Traer todos los leads activos (excluye terminales)
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .not('stage', 'in', '("cita_agendada","no_interesado","escalado")')

  if (leadsErr) {
    console.error('Error fetching leads:', leadsErr)
    return NextResponse.json({ error: leadsErr.message }, { status: 500 })
  }

  for (const lead of leads) {
    try {
      results.processed++

      // Traer conversaciones del lead
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, bot_paused')
        .eq('lead_id', lead.id)

      if (!conversations?.length) continue

      // Si un asesor humano tomó control en CUALQUIER conversación y nunca reactivó el bot,
      // no enviar seguimiento automático bajo ninguna circunstancia
      const { data: pausedConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('bot_paused', true)
        .limit(1)

      if (pausedConv?.length > 0) continue

      const convIds = conversations.map((c) => c.id)

      // Traer mensajes ordenados cronológicamente
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })

      if (!messages?.length) continue

      const followUpCount  = lead.metadata?.follow_up_count  || 0
      const lastFollowUpAt = lead.metadata?.last_follow_up_at || null

      const classification = classifyLead(messages)
      const decision = shouldSendFollowUp(classification, followUpCount, lastFollowUpAt)

      if (!decision) continue

      // ── Marcar como no interesado ──────────────────────────────────────
      if (decision.action === 'no_interesado') {
        await supabase
          .from('leads')
          .update({ stage: 'no_interesado', updated_at: new Date().toISOString() })
          .eq('id', lead.id)

        const hubspotDealId = lead.metadata?.hubspot_deal_id
        if (hubspotDealId) {
          updateDealStage(hubspotDealId, 'no_interesado').catch((e) =>
            console.error('HubSpot no_interesado:', e.message)
          )
        }

        console.log(`Lead ${lead.phone} → no_interesado (sin respuesta 10d)`)
        results.no_interesado++
        continue
      }

      // ── Enviar seguimiento ─────────────────────────────────────────────
      if (decision.action === 'send_followup') {
        // Solo enviar mensajes entre 7am y 9pm hora CDMX
        const hourCDMX = getHourCDMX()
        if (hourCDMX < 7 || hourCDMX >= 21) continue

        const message = await generateFollowUpMessage(
          lead,
          messages,
          decision.followUpNumber,
          decision.type
        )

        await sendWhatsAppMessage(lead.phone, message)

        // Guardar el mensaje de seguimiento en la conversación más reciente
        const lastConvId = convIds[convIds.length - 1]
        await supabase.from('messages').insert({
          conversation_id: lastConvId,
          business_id: lead.business_id,
          role: 'bot',
          content: message,
        })

        // Actualizar metadata del lead con el nuevo conteo
        await supabase
          .from('leads')
          .update({
            updated_at: new Date().toISOString(),
            metadata: {
              ...lead.metadata,
              follow_up_count:   decision.followUpNumber,
              last_follow_up_at: new Date().toISOString(),
              follow_up_type:    decision.type,
            },
          })
          .eq('id', lead.id)

        console.log(
          `Seguimiento #${decision.followUpNumber} (${decision.type}) → ${lead.phone}`
        )
        results.followups_sent++
      }
    } catch (err) {
      console.error(`Error procesando lead ${lead.id}:`, err.message)
      results.errors.push({ lead_id: lead.id, error: err.message })
    }
  }

  console.log('Cron followups result:', results)
  return NextResponse.json(results)
}
