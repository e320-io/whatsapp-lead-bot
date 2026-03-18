import { createClient } from '@supabase/supabase-js'

// Cliente para leer la base de datos del POS
const posSupabase = createClient(
  process.env.POS_SUPABASE_URL,
  process.env.POS_SUPABASE_KEY
)

// Mapeo de sucursales
const SUCURSALES = {
  'Coapa': 1,
  'Valle': 2,
  'Oriente': 3,
  'Polanco': 4,
  'Metepec': 5,
}

/**
 * Obtener horarios disponibles para una sucursal en una fecha
 * @param {string} sucursalNombre - Nombre de la sucursal
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Array} Lista de horarios disponibles
 */
export async function getAvailableSlots(sucursalNombre, fecha) {
  const sucursalId = SUCURSALES[sucursalNombre]
  if (!sucursalId) {
    console.error('Sucursal no encontrada:', sucursalNombre)
    return []
  }

  // Obtener citas existentes para esa sucursal y fecha
  const { data: citas, error } = await posSupabase
    .from('citas')
    .select('hora_inicio, hora_fin, duracion_min')
    .eq('sucursal_id', sucursalId)
    .eq('fecha', fecha)
    .in('estado', ['agendada', 'confirmada', 'en_proceso'])

  if (error) {
    console.error('Error consultando citas del POS:', error)
    return []
  }

  // Horario de operación
  const dayOfWeek = new Date(fecha + 'T12:00:00').getDay()
  // 0 = domingo, 6 = sábado
  if (dayOfWeek === 0) return [] // Domingo cerrado

  const horaApertura = 10 // 10:00 AM
  const horaCierre = dayOfWeek === 6 ? 14 : 19 // Sábado 14:00, L-V 19:00

  // Generar slots de 30 minutos
  const allSlots = []
  for (let h = horaApertura; h < horaCierre; h++) {
    allSlots.push(`${String(h).padStart(2, '0')}:00`)
    allSlots.push(`${String(h).padStart(2, '0')}:30`)
  }

  // Filtrar slots ocupados
  const occupiedSlots = new Set()
  if (citas) {
    citas.forEach((cita) => {
      // Marcar como ocupado el slot de inicio y los que cubra la duración
      const [startH, startM] = cita.hora_inicio.split(':').map(Number)
      const duracion = cita.duracion_min || 30
      const slotsNeeded = Math.ceil(duracion / 30)

      for (let i = 0; i < slotsNeeded; i++) {
        const totalMinutes = startH * 60 + startM + i * 30
        const slotH = Math.floor(totalMinutes / 60)
        const slotM = totalMinutes % 60
        occupiedSlots.add(
          `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`
        )
      }
    })
  }

  const available = allSlots.filter((slot) => !occupiedSlots.has(slot))

  return available
}

/**
 * Verificar disponibilidad resumida para el bot
 * Devuelve un texto amigable con los horarios disponibles
 */
export async function getAvailabilityText(sucursalNombre, fecha) {
  const slots = await getAvailableSlots(sucursalNombre, fecha)

  if (slots.length === 0) {
    return 'No hay horarios disponibles para ese día.'
  }

  // Agrupar por mañana/tarde para no abrumar
  const manana = slots.filter((s) => {
    const h = parseInt(s.split(':')[0])
    return h < 14
  })
  const tarde = slots.filter((s) => {
    const h = parseInt(s.split(':')[0])
    return h >= 14
  })

  let text = 'Horarios disponibles:\n'
  if (manana.length > 0) {
    text += `Mañana: ${manana[0]} - ${manana[manana.length - 1]}\n`
  }
  if (tarde.length > 0) {
    text += `Tarde: ${tarde[0]} - ${tarde[tarde.length - 1]}`
  }

  return text
}

/**
 * Obtener resumen rápido: ¿hay disponibilidad para un día?
 */
export async function hasAvailability(sucursalNombre, fecha) {
  const slots = await getAvailableSlots(sucursalNombre, fecha)
  return slots.length > 0
}
