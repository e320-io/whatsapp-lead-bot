// WhatsApp Business labels — definition and auto-detection logic

export var LABELS = [
  { key: 'pedido_completado',  label: 'Pedido completado',  emoji: '',   color: '#5B21B6' },
  { key: 'viene_a_pagar',      label: 'viene a pagar',       emoji: '',   color: '#16A34A' },
  { key: 'seguimiento',        label: 'seguimiento',         emoji: '🔥', color: '#2563EB' },
  { key: 'sin_interes',        label: 'sin interes',         emoji: '🙂', color: '#6B7280' },
  { key: 'importante',         label: 'importante',          emoji: '❗', color: '#65A30D' },
  { key: 'polanco',            label: 'Polanco',             emoji: '',   color: '#111827' },
  { key: 'hifu_corporal',      label: 'Hifu corporal',       emoji: '🍑', color: '#D97706' },
  { key: 'hifu_lifting',       label: 'HIFU/lifting',        emoji: '🧖', color: '#92400E' },
  { key: 'cuerpo_completo',    label: 'cuerpo completo',     emoji: '🧖', color: '#374151' },
  { key: 'corporales',         label: 'corporales',          emoji: '🍑', color: '#7C3AED' },
  { key: 'combos',             label: 'combos',              emoji: '👙🧖', color: '#EC4899' },
  { key: 'bikinis',            label: 'bikinis',             emoji: '👙', color: '#9F1239' },
  { key: 'axilas_y_otros',     label: 'axilas y otros',      emoji: '👩', color: '#10B981' },
  { key: 'faciales',           label: 'faciales',            emoji: '🧖', color: '#DB2777' },
  { key: 'cera',               label: 'cera',                emoji: '🕯️', color: '#6D28D9' },
  { key: 'cliente_dv',         label: 'cliente DV',          emoji: '⭐', color: '#0891B2' },
  { key: 'nuevo_pedido',       label: 'nuevo pedido',        emoji: '',   color: '#8B5CF6' },
]

function normalize(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Returns the label key that best fits the lead given its stage, branch, and messages.
// Priority: status-based first, then service-keyword, then branch, then default.
export function detectLabel(lead, messages, branchName) {
  var stage = lead.stage || 'nuevo'
  var allText = normalize(messages.map(function(m) { return m.content || '' }).join(' '))

  // 1. Status-based (highest priority)
  if (stage === 'cita_agendada' || stage === 'anticipo_tomado') {
    return 'pedido_completado'
  }

  if (stage === 'anticipo_pendiente' || /viene a pagar|ir a pagar|paso a pagar|voy a pagar|anticipo/.test(allText)) {
    return 'viene_a_pagar'
  }

  if (stage === 'escalado') {
    return 'seguimiento'
  }

  if (stage === 'no_interesado') {
    return 'sin_interes'
  }

  // 2. Special intent keywords
  if (/urgente|muy importante|emergencia/.test(allText)) {
    return 'importante'
  }

  // 3. Branch
  if (branchName && normalize(branchName) === 'polanco') {
    return 'polanco'
  }

  // 4. Service keywords — more specific first
  if (/hifu corporal|hifu cuerpo|lifting corporal|ultraformer corporal/.test(allText)) {
    return 'hifu_corporal'
  }

  if (/hifu|lifting facial|ultraformer|ultherapy|tensor facial/.test(allText)) {
    return 'hifu_lifting'
  }

  if (/cuerpo completo|full body/.test(allText)) {
    return 'cuerpo_completo'
  }

  if (/combo/.test(allText)) {
    return 'combos'
  }

  if (/bikini/.test(allText)) {
    return 'bikinis'
  }

  if (/axila/.test(allText)) {
    return 'axilas_y_otros'
  }

  if (/facial|limpieza facial|tratamiento facial/.test(allText)) {
    return 'faciales'
  }

  if (/\bcera\b/.test(allText)) {
    return 'cera'
  }

  if (/corporal|brazos|piernas|espalda|pecho|abdomen/.test(allText)) {
    return 'corporales'
  }

  if (/dv\b|diamond|frecuente|vip/.test(allText)) {
    return 'cliente_dv'
  }

  return 'nuevo_pedido'
}
