const BASE = 'https://api.hubapi.com'

const STAGE_MAP = {
  nuevo: 'appointmentscheduled',
  en_conversacion: 'qualifiedtobuy',
  anticipo_tomado: 'presentationscheduled',
  cita_agendada: 'decisionmakerboughtin',
  no_interesado: 'contractsent',
  escalado: 'qualifiedtobuy',
}

async function hs(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

export async function findOrCreateContact({ phone, name }) {
  const search = await hs('POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'phone', operator: 'EQ', value: phone }] }],
    limit: 1,
  })

  if (search.total > 0) return search.results[0].id

  const parts = (name || '').split(' ')
  const contact = await hs('POST', '/crm/v3/objects/contacts', {
    properties: {
      phone,
      firstname: parts[0] || '',
      lastname: parts.slice(1).join(' ') || '',
      hs_lead_status: 'NEW',
    },
  })
  return contact.id
}

export async function findOrCreateDeal({ contactId, phone, name, stage }) {
  const dealname = `WhatsApp - ${name || phone}`
  const stageId = STAGE_MAP[stage] || 'appointmentscheduled'

  const search = await hs('POST', '/crm/v3/objects/deals/search', {
    filterGroups: [{ filters: [{ propertyName: 'dealname', operator: 'EQ', value: dealname }] }],
    limit: 1,
  })

  if (search.total > 0) return search.results[0].id

  const deal = await hs('POST', '/crm/v3/objects/deals', {
    properties: {
      dealname,
      dealstage: stageId,
      pipeline: 'default',
      closedate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    associations: [{
      to: { id: contactId },
      types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
    }],
  })
  return deal.id
}

export async function updateDealStage(dealId, stage) {
  const stageId = STAGE_MAP[stage] || 'appointmentscheduled'
  await hs('PATCH', `/crm/v3/objects/deals/${dealId}`, {
    properties: { dealstage: stageId },
  })
}
