'use client'

import { useState, useEffect, useRef } from 'react'

const STAGES = [
  { key: 'nuevo', label: 'Nuevo Lead', color: '#6b7280' },
  { key: 'en_conversacion', label: 'En Conversación', color: '#2563eb' },
  { key: 'anticipo_tomado', label: 'Anticipo Tomado', color: '#7c3aed' },
  { key: 'cita_agendada', label: 'Cita Agendada', color: '#16a34a' },
  { key: 'no_interesado', label: 'No Interesado', color: '#dc2626' },
  { key: 'escalado', label: 'Escalado', color: '#ea580c' },
]

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]))

const STATUS_LABELS = {
  activa: { label: 'Activa', color: '#16a34a' },
  escalada: { label: 'Escalada', color: '#dc2626' },
  cerrada: { label: 'Cerrada', color: '#6b7280' },
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function formatFullTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function Dashboard() {
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [tab, setTab] = useState('conversaciones')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchLeads()
    const interval = setInterval(fetchLeads, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selected) fetchMessages(selected.id)
  }, [selected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchLeads() {
    try {
      const res = await fetch('/api/dashboard/leads')
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages(leadId) {
    setLoadingMsgs(true)
    setMessages([])
    setConversations([])
    try {
      const res = await fetch(`/api/dashboard/leads/${leadId}`)
      const data = await res.json()
      setMessages(data.messages || [])
      setConversations(data.conversations || [])
    } finally {
      setLoadingMsgs(false)
    }
  }

  const filtered = leads.filter((l) => {
    const name = l.name || ''
    const phone = l.phone || ''
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search)
    const matchStage = filterStage === 'all' || l.stage === filterStage
    return matchSearch && matchStage
  })

  const byStage = Object.fromEntries(STAGES.map((s) => [s.key, []]))
  leads.forEach((l) => {
    const key = l.stage || 'nuevo'
    if (byStage[key]) byStage[key].push(l)
    else byStage['nuevo'].push(l)
  })

  function buildChatItems() {
    if (!conversations.length || !messages.length) return messages.map((m) => ({ type: 'message', data: m }))
    const items = []
    let lastConvId = null
    messages.forEach((msg) => {
      if (msg.conversation_id !== lastConvId) {
        const conv = conversations.find((c) => c.id === msg.conversation_id)
        items.push({ type: 'separator', data: conv })
        lastConvId = msg.conversation_id
      }
      items.push({ type: 'message', data: msg })
    })
    return items
  }

  const lastConv = selected?.last_conversation
  const selectedStage = STAGE_MAP[selected?.stage] || { label: selected?.stage, color: '#6b7280' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f0f2f5' }}>

      {/* Top bar con tabs */}
      <div style={{ background: '#075e54', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '4px', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px', marginRight: '24px' }}>💬 CIRE Bot</span>
        {[
          { key: 'conversaciones', label: '💬 Conversaciones' },
          { key: 'pipeline', label: '📊 Pipeline CRM' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '14px 20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              background: 'transparent',
              color: tab === t.key ? '#fff' : '#b2dfdb',
              borderBottom: tab === t.key ? '3px solid #25d366' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: '#b2dfdb', fontSize: '12px' }}>
          {leads.length} leads · actualiza cada 30s
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── TAB: CONVERSACIONES ── */}
        {tab === 'conversaciones' && (
          <div style={{ width: '360px', minWidth: '280px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '20px',
                  border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box', marginBottom: '8px'
                }}
              />
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', background: '#fff',
                  fontSize: '13px', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="all">Todas las etapas</option>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Cargando...</div>}
              {!loading && filtered.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No hay leads</div>}
              {filtered.map((lead) => {
                const isSelected = selected?.id === lead.id
                const stageInfo = STAGE_MAP[lead.stage] || { label: lead.stage, color: '#6b7280' }
                const lastMsg = lead.last_message
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      background: isSelected ? '#e9f5e9' : '#fff',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '50%', background: '#25d366',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: '700', fontSize: '17px', flexShrink: 0
                    }}>
                      {(lead.name || lead.phone || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>{lead.name || 'Sin nombre'}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{formatTime(lastMsg?.created_at || lead.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '1px' }}>
                        {lead.phone}
                        {lead.conversation_count > 1 && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9ca3af' }}>· {lead.conversation_count} sesiones</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                          {lastMsg ? (lastMsg.role === 'bot' ? '🤖 ' : '👤 ') + lastMsg.content : 'Sin mensajes'}
                        </span>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                          background: stageInfo.color + '20', color: stageInfo.color, fontWeight: '600',
                          flexShrink: 0, marginLeft: '4px'
                        }}>
                          {stageInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB: PIPELINE CRM ── */}
        {tab === 'pipeline' && (
          <div style={{ display: 'flex', gap: '12px', padding: '16px', overflowX: 'auto', flex: '0 0 auto', width: selected ? '55%' : '100%', maxWidth: selected ? '55%' : '100%', transition: 'width 0.2s' }}>
            {STAGES.map((stage) => {
              const stageLeads = byStage[stage.key] || []
              return (
                <div key={stage.key} style={{ minWidth: '220px', width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Header columna */}
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: stage.color + '15', borderTop: `3px solid ${stage.color}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: stage.color }}>{stage.label}</span>
                    <span style={{
                      background: stage.color, color: '#fff',
                      borderRadius: '12px', padding: '1px 8px', fontSize: '12px', fontWeight: '700'
                    }}>
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
                    {stageLeads.length === 0 && (
                      <div style={{
                        padding: '20px 12px', textAlign: 'center', color: '#d1d5db',
                        fontSize: '13px', border: '2px dashed #e5e7eb', borderRadius: '10px'
                      }}>
                        Sin leads
                      </div>
                    )}
                    {stageLeads.map((lead) => {
                      const isSelected = selected?.id === lead.id
                      const lastMsg = lead.last_message
                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelected(isSelected ? null : lead)}
                          style={{
                            background: isSelected ? '#e9f5e9' : '#fff',
                            border: isSelected ? `2px solid ${stage.color}` : '2px solid transparent',
                            borderRadius: '10px', padding: '12px',
                            cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', background: '#25d366',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: '700', fontSize: '13px', flexShrink: 0
                            }}>
                              {(lead.name || lead.phone || '?')[0].toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lead.name || 'Sin nombre'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{lead.phone}</div>
                            </div>
                          </div>
                          {lastMsg && (
                            <div style={{
                              fontSize: '12px', color: '#6b7280', padding: '6px 8px',
                              background: '#f9fafb', borderRadius: '6px',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {lastMsg.role === 'bot' ? '🤖 ' : '👤 '}{lastMsg.content}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
                            <span>{lead.branches?.name || 'Sin sucursal'}</span>
                            <span>{formatTime(lastMsg?.created_at || lead.created_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PANEL DERECHO: CONVERSACIÓN ── */}
        {!selected && tab === 'conversaciones' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>💬</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Selecciona un lead</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>para ver la conversación completa</div>
          </div>
        ) : selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Header chat */}
            <div style={{ padding: '12px 20px', background: '#075e54', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', background: '#25d366',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '15px', flexShrink: 0
              }}>
                {(selected.name || selected.phone || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>{selected.name || 'Sin nombre'}</div>
                <div style={{ color: '#b2dfdb', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>{selected.phone}</span>
                  {selected.branches?.name && <><span>·</span><span>{selected.branches.name}</span></>}
                  <span>·</span>
                  <span style={{ background: selectedStage.color + '40', color: '#fff', padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                    {selectedStage.label}
                  </span>
                  {lastConv && (
                    <><span>·</span>
                    <span style={{ background: (STATUS_LABELS[lastConv.status]?.color || '#6b7280') + '40', color: '#fff', padding: '1px 8px', borderRadius: '10px', fontSize: '11px' }}>
                      {STATUS_LABELS[lastConv.status]?.label || lastConv.status}
                    </span></>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'transparent', border: 'none', color: '#b2dfdb', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Mensajes */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 40px', background: '#e5ddd5',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }}>
              {loadingMsgs && <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px', fontSize: '14px' }}>Cargando mensajes...</div>}
              {!loadingMsgs && messages.length === 0 && <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px', fontSize: '14px' }}>Sin mensajes</div>}
              {buildChatItems().map((item, i) => {
                if (item.type === 'separator') {
                  const conv = item.data
                  const statusInfo = STATUS_LABELS[conv?.status] || { label: conv?.status, color: '#6b7280' }
                  return (
                    <div key={`sep-${conv?.id || i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 12px' }}>
                      <div style={{ flex: 1, height: '1px', background: '#c9c9c9' }} />
                      <div style={{ fontSize: '12px', color: '#6b7280', background: '#d9fdd3', padding: '4px 12px', borderRadius: '12px', whiteSpace: 'nowrap', border: '1px solid #c9c9c9' }}>
                        Sesión · {formatDate(conv?.created_at)} · <span style={{ color: statusInfo.color, fontWeight: '600' }}>{statusInfo.label}</span>
                      </div>
                      <div style={{ flex: 1, height: '1px', background: '#c9c9c9' }} />
                    </div>
                  )
                }
                const msg = item.data
                const isBot = msg.role === 'bot'
                return (
                  <div key={msg.id || i} style={{ display: 'flex', justifyContent: isBot ? 'flex-end' : 'flex-start', marginBottom: '6px' }}>
                    <div style={{
                      maxWidth: '65%', padding: '8px 12px',
                      borderRadius: isBot ? '12px 0 12px 12px' : '0 12px 12px 12px',
                      background: isBot ? '#dcf8c6' : '#fff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: isBot ? '#128c7e' : '#075e54', marginBottom: '2px' }}>
                        {isBot ? '🤖 Bot' : '👤 Lead'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right', marginTop: '4px' }}>
                        {formatFullTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '8px 20px', background: '#f0f2f5', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
              Vista de solo lectura · {messages.length} mensajes en {conversations.length} sesión{conversations.length !== 1 ? 'es' : ''}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
