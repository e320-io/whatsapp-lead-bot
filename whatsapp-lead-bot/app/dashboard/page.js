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
  const [filterBranch, setFilterBranch] = useState('all')
  const [branches, setBranches] = useState([])
  const [tab, setTab] = useState('conversaciones')
  const [anticipos, setAnticipos] = useState([])
  const [confirmingId, setConfirmingId] = useState(null)
  const [botPaused, setBotPaused] = useState(false)
  const [humanMessage, setHumanMessage] = useState('')
  const [sendingHuman, setSendingHuman] = useState(false)
  const [sendingImage, setSendingImage] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [quickReplies, setQuickReplies] = useState([])
  const [showQRPanel, setShowQRPanel] = useState(false)
  const [qrFilter, setQrFilter] = useState('')
  const [showAddQR, setShowAddQR] = useState(false)
  const [newQR, setNewQR] = useState({ shortcut: '', content: '' })
  const [savingQR, setSavingQR] = useState(false)

  const PRESET_IMAGES = [
    { label: '👙 Bikini Hot Sale', file: 'Bikini-hotsale.jpeg' },
    { label: '✨ HIFU Corporal', file: 'Hifu_corporal1.jpeg' },
    { label: '✨ HIFU Corporal 2', file: 'Hifu-corporal2.jpeg' },
  ]
  const messagesEndRef = useRef(null)
  const qrPanelRef = useRef(null)

  useEffect(() => {
    fetchLeads()
    fetchBranches()
    fetchAnticipos()
    fetchQuickReplies()
    const interval = setInterval(() => { fetchLeads(); fetchAnticipos() }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Al seleccionar un lead: carga inicial + sincroniza botPaused desde DB
  useEffect(() => {
    if (!selected) return
    fetchMessages(selected.id, { initial: true }).then((data) => {
      const active = (data?.conversations || []).find((c) => c.status === 'activa')
      setBotPaused(active?.bot_paused || false)
    })
  }, [selected?.id])

  // Auto-refresh silencioso cada 8s (no toca botPaused)
  useEffect(() => {
    if (!selected) return
    const interval = setInterval(() => fetchMessages(selected.id, { initial: false }), 8000)
    return () => clearInterval(interval)
  }, [selected?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!showQRPanel) return
    function handleClickOutside(e) {
      if (qrPanelRef.current && !qrPanelRef.current.contains(e.target)) {
        setShowQRPanel(false)
        setShowAddQR(false)
        setQrFilter('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showQRPanel])

  async function fetchAnticipos() {
    try {
      const res = await fetch('/api/dashboard/anticipos')
      const data = await res.json()
      setAnticipos(Array.isArray(data) ? data : [])
    } catch {}
  }

  async function fetchQuickReplies() {
    try {
      const res = await fetch('/api/dashboard/quick-replies')
      const data = await res.json()
      setQuickReplies(Array.isArray(data) ? data : [])
    } catch {}
  }

  async function saveQuickReply() {
    if (!newQR.shortcut.trim() || !newQR.content.trim()) return
    setSavingQR(true)
    try {
      const res = await fetch('/api/dashboard/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQR),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setQuickReplies((prev) => [...prev, data].sort((a, b) => a.shortcut.localeCompare(b.shortcut)))
      setNewQR({ shortcut: '', content: '' })
      setShowAddQR(false)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSavingQR(false)
    }
  }

  async function deleteQuickReply(id) {
    if (!confirm('¿Eliminar esta respuesta rápida?')) return
    try {
      await fetch(`/api/dashboard/quick-replies/${id}`, { method: 'DELETE' })
      setQuickReplies((prev) => prev.filter((qr) => qr.id !== id))
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  async function confirmarAnticipo(pendingId) {
    setConfirmingId(pendingId)
    try {
      const res = await fetch('/api/dashboard/anticipos/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchAnticipos()
        await fetchLeads()
      } else {
        alert('Error: ' + (data.error || 'No se pudo confirmar'))
      }
    } catch (e) {
      alert('Error al confirmar: ' + e.message)
    } finally {
      setConfirmingId(null)
    }
  }

  async function fetchBranches() {
    try {
      const res = await fetch('/api/dashboard/branches')
      const data = await res.json()
      setBranches(Array.isArray(data) ? data : [])
    } catch {}
  }

  async function fetchLeads() {
    try {
      const res = await fetch('/api/dashboard/leads')
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch {
      // silently ignore network/server errors — dashboard stays with stale data
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages(leadId, { initial = true } = {}) {
    if (initial) {
      setLoadingMsgs(true)
      setMessages([])
      setConversations([])
    }
    try {
      const res = await fetch(`/api/dashboard/leads/${leadId}`)
      const data = await res.json()
      setMessages(data.messages || [])
      setConversations(data.conversations || [])
      return data
    } finally {
      if (initial) setLoadingMsgs(false)
    }
  }

  function matchesBranchFilter(lead) {
    if (filterBranch === 'all') return true
    return lead.branches?.name === filterBranch
  }

  const filtered = leads.filter((l) => {
    const name = l.name || ''
    const phone = l.phone || ''
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search)
    const matchStage = filterStage === 'all' || l.stage === filterStage
    return matchSearch && matchStage && matchesBranchFilter(l)
  })

  const byStage = Object.fromEntries(STAGES.map((s) => [s.key, []]))
  leads.filter(matchesBranchFilter).forEach((l) => {
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

  const activeConv = conversations.find((c) => c.status === 'activa')

  async function handleTakeover(paused) {
    const convId = activeConv?.id
    if (!convId) return
    // Actualizar UI de inmediato para respuesta instantánea
    setBotPaused(paused)
    setTakingOver(true)
    try {
      const res = await fetch('/api/dashboard/takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, paused }),
      })
      const data = await res.json()
      if (!data.success) {
        // Revertir si falló
        setBotPaused(!paused)
        alert('Error: ' + (data.error || 'No se pudo cambiar el modo'))
      }
    } catch (e) {
      setBotPaused(!paused)
      alert('Error: ' + e.message)
    } finally {
      setTakingOver(false)
    }
  }

  async function handleSendHumanMessage() {
    if (!humanMessage.trim() || !selected || !activeConv) return
    setSendingHuman(true)
    try {
      const res = await fetch('/api/dashboard/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selected.id, conversationId: activeConv.id, message: humanMessage }),
      })
      const data = await res.json()
      if (data.success) {
        setHumanMessage('')
        await fetchMessages(selected.id)
      } else {
        alert('Error al enviar: ' + (data.error || 'Intenta de nuevo'))
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSendingHuman(false)
    }
  }

  async function handleSendImage(file) {
    if (!selected || !activeConv) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const imageUrl = appUrl + '/images/' + file
    setSendingImage(file)
    try {
      const res = await fetch('/api/dashboard/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selected.id, conversationId: activeConv.id, imageUrl }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchMessages(selected.id)
      } else {
        alert('Error al enviar imagen: ' + (data.error || 'Intenta de nuevo'))
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSendingImage(false)
    }
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
          { key: 'anticipos', label: '💳 Anticipos' + (anticipos.length > 0 ? ` (${anticipos.length})` : '') },
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
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', background: '#fff',
                    fontSize: '13px', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="all">Todas las etapas</option>
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', background: '#fff',
                    fontSize: '13px', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="all">Todas las sucursales</option>
                  {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 auto', width: selected ? '55%' : '100%', maxWidth: selected ? '55%' : '100%', transition: 'width 0.2s', overflow: 'hidden' }}>

            {/* Barra de filtros del pipeline */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Sucursal:</span>
              {[{ id: 'all', name: 'Todas' }, ...branches].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setFilterBranch(b.id === 'all' ? 'all' : b.name)}
                  style={{
                    padding: '4px 12px', borderRadius: '20px', border: '1px solid',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    borderColor: filterBranch === (b.id === 'all' ? 'all' : b.name) ? '#075e54' : '#e5e7eb',
                    background: filterBranch === (b.id === 'all' ? 'all' : b.name) ? '#075e54' : '#fff',
                    color: filterBranch === (b.id === 'all' ? 'all' : b.name) ? '#fff' : '#374151',
                    transition: 'all 0.15s',
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>

          <div style={{ display: 'flex', gap: '12px', padding: '16px', overflowX: 'auto', flex: 1 }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 185px)' }}>
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
          </div>
        )}

        {/* ── TAB: ANTICIPOS ── */}
        {tab === 'anticipos' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Anticipos pendientes de verificación</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Verifica el pago en tu banco y presiona "Confirmar pago" para agendar la cita automáticamente.</p>
              </div>

              {anticipos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', background: '#fff', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>Sin anticipos pendientes</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>Aquí aparecerán los comprobantes cuando las clientas los envíen</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {anticipos.map((ap) => {
                  const isComprobante = ap.status === 'comprobante_recibido'
                  const isConfirming = confirmingId === ap.id
                  const leadName = ap.leads?.name || ap.nombre || 'Sin nombre'
                  const phone = ap.leads?.phone || ap.phone
                  const sucursal = ap.leads?.branches?.name || ap.sucursal
                  return (
                    <div key={ap.id} style={{
                      background: '#fff', borderRadius: '12px', padding: '20px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      border: isComprobante ? '2px solid #16a34a' : '2px solid #e5e7eb',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%', background: '#25d366',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: '700', fontSize: '14px', flexShrink: 0
                            }}>
                              {(leadName)[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{leadName}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{phone}</div>
                            </div>
                            <span style={{
                              fontSize: '11px', padding: '2px 10px', borderRadius: '12px', fontWeight: '700',
                              background: isComprobante ? '#dcfce7' : '#fef3c7',
                              color: isComprobante ? '#16a34a' : '#d97706',
                              marginLeft: '4px',
                            }}>
                              {isComprobante ? '✅ Comprobante recibido' : '⏳ Esperando comprobante'}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginTop: '8px' }}>
                            {[
                              { label: 'Servicio', value: ap.servicio },
                              { label: 'Fecha', value: ap.fecha },
                              { label: 'Hora', value: ap.hora },
                              { label: 'Sucursal', value: sucursal || 'N/A' },
                              { label: 'Anticipo', value: '$' + (ap.monto_anticipo || 200) },
                              { label: 'Solicitado', value: formatFullTime(ap.created_at) },
                            ].map((item) => (
                              <div key={item.label} style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 10px' }}>
                                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600', marginBottom: '2px' }}>{item.label}</div>
                                <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                          <button
                            onClick={() => confirmarAnticipo(ap.id)}
                            disabled={isConfirming}
                            style={{
                              padding: '10px 20px', borderRadius: '8px', border: 'none',
                              background: isConfirming ? '#9ca3af' : '#16a34a',
                              color: '#fff', fontSize: '14px', fontWeight: '700',
                              cursor: isConfirming ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isConfirming ? 'Confirmando...' : '✅ Confirmar pago'}
                          </button>
                          <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>
                            Crea la cita en el POS y<br />avisa a la clienta por WhatsApp
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
              {activeConv && (
                botPaused ? (
                  <button
                    onClick={() => handleTakeover(false)}
                    disabled={takingOver}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none',
                      background: takingOver ? '#9ca3af' : '#dc2626',
                      color: '#fff', fontWeight: '700', fontSize: '12px',
                      cursor: takingOver ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {takingOver ? '...' : '🤖 Devolver al bot'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleTakeover(true)}
                    disabled={takingOver}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none',
                      background: takingOver ? '#9ca3af' : '#25d366',
                      color: '#fff', fontWeight: '700', fontSize: '12px',
                      cursor: takingOver ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {takingOver ? '...' : '👩 Tomar conversación'}
                  </button>
                )
              )}
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
                const isHumanAgent = msg.is_human_agent
                return (
                  <div key={msg.id || i} style={{ display: 'flex', justifyContent: isBot ? 'flex-end' : 'flex-start', marginBottom: '6px' }}>
                    <div style={{
                      maxWidth: '65%', padding: '8px 12px',
                      borderRadius: isBot ? '12px 0 12px 12px' : '0 12px 12px 12px',
                      background: isBot ? (isHumanAgent ? '#dbeafe' : '#dcf8c6') : '#fff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: isBot ? (isHumanAgent ? '#1d4ed8' : '#128c7e') : '#075e54', marginBottom: '2px' }}>
                        {isBot ? (isHumanAgent ? '👩 Asesora' : '🤖 Bot') : '👤 Lead'}
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

            {botPaused ? (
              <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', position: 'relative' }}>
                {/* Quick Reply Panel */}
                {showQRPanel && (
                  <div
                    ref={qrPanelRef}
                    style={{
                      position: 'absolute', bottom: '100%', left: 0, right: 0,
                      background: '#fff', border: '1px solid #e5e7eb', borderBottom: 'none',
                      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '340px',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151', whiteSpace: 'nowrap' }}>💬 Respuestas rápidas</span>
                      <input
                        autoFocus
                        value={qrFilter}
                        onChange={(e) => setQrFilter(e.target.value)}
                        placeholder="Buscar atajo..."
                        style={{
                          flex: 1, padding: '5px 10px', borderRadius: '12px', border: '1px solid #e5e7eb',
                          fontSize: '13px', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => { setShowAddQR(true); setQrFilter('') }}
                        style={{ padding: '5px 10px', borderRadius: '12px', border: '1px solid #075e54', background: '#075e54', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >+ Nueva</button>
                      <button
                        onClick={() => { setShowQRPanel(false); setShowAddQR(false); setQrFilter('') }}
                        style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }}
                      >✕</button>
                    </div>

                    {showAddQR ? (
                      <div style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input
                            value={newQR.shortcut}
                            onChange={(e) => setNewQR((p) => ({ ...p, shortcut: e.target.value }))}
                            placeholder="Atajo (ej: hola)"
                            style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none' }}
                          />
                          <button
                            onClick={saveQuickReply}
                            disabled={savingQR || !newQR.shortcut.trim() || !newQR.content.trim()}
                            style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: savingQR ? '#9ca3af' : '#075e54', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                          >{savingQR ? '...' : 'Guardar'}</button>
                          <button
                            onClick={() => { setShowAddQR(false); setNewQR({ shortcut: '', content: '' }) }}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }}
                          >Cancelar</button>
                        </div>
                        <textarea
                          value={newQR.content}
                          onChange={(e) => setNewQR((p) => ({ ...p, content: e.target.value }))}
                          placeholder="Contenido del mensaje..."
                          rows={3}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    ) : null}

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {quickReplies
                        .filter((qr) => !qrFilter || qr.shortcut.includes(qrFilter.toLowerCase().replace('/', '')) || qr.content.toLowerCase().includes(qrFilter.toLowerCase()))
                        .map((qr) => (
                          <div
                            key={qr.id}
                            style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                            onClick={() => { setHumanMessage(qr.content); setShowQRPanel(false); setQrFilter('') }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#075e54', background: '#f0fdf4', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', border: '1px solid #bbf7d0', flexShrink: 0 }}>/{qr.shortcut}</span>
                            <span style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {qr.content}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteQuickReply(qr.id) }}
                              style={{ marginLeft: 'auto', padding: '2px 6px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
                            >🗑</button>
                          </div>
                        ))}
                      {quickReplies.filter((qr) => !qrFilter || qr.shortcut.includes(qrFilter.toLowerCase().replace('/', '')) || qr.content.toLowerCase().includes(qrFilter.toLowerCase())).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No hay respuestas que coincidan</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ padding: '6px 16px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #f3f4f6' }}>
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.file}
                      onClick={() => handleSendImage(img.file)}
                      disabled={sendingImage === img.file}
                      style={{
                        padding: '4px 12px', borderRadius: '16px', border: '1px solid #d1d5db',
                        background: sendingImage === img.file ? '#f3f4f6' : '#fff',
                        fontSize: '12px', cursor: sendingImage === img.file ? 'not-allowed' : 'pointer',
                        color: '#374151', fontWeight: '500',
                      }}
                    >
                      {sendingImage === img.file ? 'Enviando...' : img.label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '11px', color: '#1d4ed8', background: '#dbeafe', padding: '3px 10px', borderRadius: '12px', fontWeight: '600', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                    👩 Modo asesora
                  </div>
                  <button
                    onClick={() => { setShowQRPanel((v) => !v); setShowAddQR(false); setQrFilter('') }}
                    style={{
                      padding: '8px 12px', borderRadius: '20px', border: '1px solid #d1fae5',
                      background: showQRPanel ? '#d1fae5' : '#f9fafb', color: '#065f46',
                      fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'center',
                    }}
                    title="Respuestas rápidas (también escribe /)"
                  >💬 Atajos</button>
                  <textarea
                    value={humanMessage}
                    onChange={(e) => {
                      const val = e.target.value
                      setHumanMessage(val)
                      if (val.endsWith('/') || val === '/') {
                        setShowQRPanel(true)
                        setQrFilter('')
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setShowQRPanel(false); setQrFilter('') }
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendHumanMessage() }
                    }}
                    placeholder="Escribe tu mensaje o / para atajos... (Enter para enviar)"
                    rows={1}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: '20px',
                      border: '1px solid #e5e7eb', fontSize: '14px',
                      resize: 'none', outline: 'none', fontFamily: 'system-ui, sans-serif',
                      maxHeight: '80px', lineHeight: '1.4',
                    }}
                  />
                  <button
                    onClick={handleSendHumanMessage}
                    disabled={sendingHuman || !humanMessage.trim()}
                    style={{
                      padding: '10px 20px', borderRadius: '20px', border: 'none',
                      background: sendingHuman || !humanMessage.trim() ? '#9ca3af' : '#075e54',
                      color: '#fff', fontWeight: '700', fontSize: '14px',
                      cursor: sendingHuman || !humanMessage.trim() ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sendingHuman ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 20px', background: '#f0f2f5', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                Vista de solo lectura · {messages.length} mensajes en {conversations.length} sesión{conversations.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
