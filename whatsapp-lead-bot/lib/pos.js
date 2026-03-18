import { createClient } from '@supabase/supabase-js'

var posSupabase = createClient(
  process.env.POS_SUPABASE_URL,
  process.env.POS_SUPABASE_KEY
)

var SUCURSALES = {
  'Coapa': 1,
  'Valle': 2,
  'Oriente': 3,
  'Polanco': 4,
  'Metepec': 5
}

var DURACIONES = {
  'facial': 90,
  'fullface': 90,
  'hifu': 90,
  'default': 60
}

function getDuracion(servicio) {
  if (!servicio) return 60
  var s = servicio.toLowerCase()
  if (s.includes('facial') || s.includes('fullface')) return 90
  if (s.includes('hifu')) return 90
  return 60
}

export async function getAvailableSlots(sucursalNombre, fecha) {
  var sucursalId = SUCURSALES[sucursalNombre]
  if (!sucursalId) return []

  var result = await posSupabase
    .from('citas')
    .select('hora_inicio, hora_fin, duracion_min')
    .eq('sucursal_id', sucursalId)
    .eq('fecha', fecha)
    .in('estado', ['agendada', 'confirmada', 'en_proceso'])

  if (result.error) {
    console.error('Error consultando citas del POS:', result.error)
    return []
  }

  var citas = result.data || []
  var dayOfWeek = new Date(fecha + 'T12:00:00').getDay()
  if (dayOfWeek === 0) return []

  var horaApertura = 10
  var horaCierre = dayOfWeek === 6 ? 14 : 19

  var allSlots = []
  for (var h = horaApertura; h < horaCierre; h++) {
    allSlots.push(String(h).padStart(2, '0') + ':00')
    allSlots.push(String(h).padStart(2, '0') + ':30')
  }

  var occupiedSlots = new Set()
  citas.forEach(function (cita) {
    var parts = cita.hora_inicio.split(':')
    var startH = parseInt(parts[0])
    var startM = parseInt(parts[1])
    var duracion = cita.duracion_min || 60
    var slotsNeeded = Math.ceil(duracion / 30)

    for (var i = 0; i < slotsNeeded; i++) {
      var totalMinutes = startH * 60 + startM + i * 30
      var slotH = Math.floor(totalMinutes / 60)
      var slotM = totalMinutes % 60
      occupiedSlots.add(
        String(slotH).padStart(2, '0') + ':' + String(slotM).padStart(2, '0')
      )
    }
  })

  return allSlots.filter(function (slot) { return !occupiedSlots.has(slot) })
}

export async function getAvailabilityForDays(sucursalNombre, numDays) {
  var results = []
  var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

  for (var i = 0; i < numDays; i++) {
    var date = new Date()
    date.setDate(date.getDate() + i)
    var dateStr = date.toISOString().split('T')[0]
    var dayName = dias[date.getDay()]

    if (date.getDay() === 0) continue

    var slots = await getAvailableSlots(sucursalNombre, dateStr)
    if (slots.length > 0) {
      var manana = slots.filter(function (s) { return parseInt(s.split(':')[0]) < 14 })
      var tarde = slots.filter(function (s) { return parseInt(s.split(':')[0]) >= 14 })
      var summary = ''
      if (manana.length > 0) summary += 'Mañana: ' + manana[0] + '-' + manana[manana.length - 1]
      if (manana.length > 0 && tarde.length > 0) summary += ' | '
      if (tarde.length > 0) summary += 'Tarde: ' + tarde[0] + '-' + tarde[tarde.length - 1]
      results.push(dayName + ' ' + dateStr + ': ' + summary)
    } else {
      results.push(dayName + ' ' + dateStr + ': SIN DISPONIBILIDAD')
    }
  }

  return results.join('\n')
}

export async function createAppointment(data) {
  var sucursalId = SUCURSALES[data.sucursal]
  if (!sucursalId) {
    return { success: false, error: 'Sucursal no encontrada' }
  }

  var duracion = getDuracion(data.servicio)
  var startParts = data.hora.split(':')
  var startH = parseInt(startParts[0])
  var startM = parseInt(startParts[1])
  var endMinutes = startH * 60 + startM + duracion
  var endH = Math.floor(endMinutes / 60)
  var endM = endMinutes % 60
  var horaFin = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0')

  var slots = await getAvailableSlots(data.sucursal, data.fecha)
  if (!slots.includes(data.hora)) {
    return { success: false, error: 'Ese horario ya no está disponible' }
  }

  var result = await posSupabase
    .from('citas')
    .insert({
      clienta_nombre: data.nombre || 'Lead WhatsApp',
      sucursal_id: sucursalId,
      sucursal_nombre: data.sucursal,
      servicio: data.servicio || 'Primera sesión depilación láser',
      tipo_servicio: 'depilacion',
      duracion_min: duracion,
      fecha: data.fecha,
      hora_inicio: data.hora,
      hora_fin: horaFin,
      sesion_numero: 1,
      es_cobro: false,
      estado: 'agendada',
      notas: 'Agendada por WhatsApp Bot - Tel: ' + (data.telefono || 'N/A')
    })
    .select()
    .single()

  if (result.error) {
    console.error('Error creando cita:', result.error)
    return { success: false, error: result.error.message }
  }

  return { success: true, cita: result.data }
}
