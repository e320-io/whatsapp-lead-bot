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

function getMexicoDate(daysFromNow) {
  var now = new Date()
  var mexicoOffset = -6 * 60
  var utcMinutes = now.getTime() + now.getTimezoneOffset() * 60000
  var mexicoTime = new Date(utcMinutes + mexicoOffset * 60000)
  if (daysFromNow) {
    mexicoTime.setDate(mexicoTime.getDate() + daysFromNow)
  }
  return mexicoTime
}

function formatDate(date) {
  var y = date.getFullYear()
  var m = String(date.getMonth() + 1).padStart(2, '0')
  var d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

function getDuracion(servicio) {
  if (!servicio) return 60
  var s = servicio.toLowerCase()
  if (s.includes('facial') || s.includes('fullface')) return 90
  if (s.includes('hifu')) return 90
  return 60
}

function getTipoServicio(servicio) {
  if (!servicio) return 'laser'
  var s = servicio.toLowerCase()
  if (s.includes('facial') || s.includes('fullface') || s.includes('limpieza')) return 'facial_full'
  if (s.includes('hifu')) return 'hifu'
  return 'laser'
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
  var dateParts = fecha.split('-')
  var dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
  var dayOfWeek = dateObj.getDay()
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
    var date = getMexicoDate(i)
    var dateStr = formatDate(date)
    var dayName = dias[date.getDay()]

    if (date.getDay() === 0) continue

    var slots = await getAvailableSlots(sucursalNombre, dateStr)
    if (slots.length > 0) {
      var manana = slots.filter(function (s) { return parseInt(s.split(':')[0]) < 14 })
      var tarde = slots.filter(function (s) { return parseInt(s.split(':')[0]) >= 14 })
      var summary = ''
      if (manana.length > 0) summary += 'Mañana: ' + manana.join(', ')
      if (manana.length > 0 && tarde.length > 0) summary += ' | '
      if (tarde.length > 0) summary += 'Tarde: ' + tarde.join(', ')
      results.push(dayName + ' ' + dateStr + ': ' + summary)
    } else {
      results.push(dayName + ' ' + dateStr + ': SIN DISPONIBILIDAD')
    }
  }

  return results.join('\n')
}

var CLABE_POR_SUCURSAL = {
  'Polanco': { banco: 'BBVA Bancomer', cuenta: '0124923510', clabe: '012180001249235103', titular: 'Cire Depilación Sas de CV', concepto: 'tu nombre completo y servicio de depilación' },
  'Valle':   { banco: 'BBVA Bancomer', cuenta: '0124923510', clabe: '012180001249235103', titular: 'Cire Depilación Sas de CV', concepto: 'tu nombre completo y servicio de depilación' },
  'Coapa':   { banco: 'Banorte', cuenta: '1291989155', clabe: '072180012919891550', titular: 'Fabiola Tinoco Vazquez', concepto: 'tu nombre completo y servicio de depilación' },
  'Oriente': { banco: 'BBVA Bancomer', cuenta: '1508294296', clabe: '012180015082942966', titular: 'Marcela López Gallardo', concepto: 'tu nombre completo y servicio de depilación' },
  'Metepec': { banco: 'BBVA', cuenta: '0479775676', clabe: '012180004797756762', titular: 'Miguel Ángel Conde Alejandri', tarjeta: '4152313939555350', concepto: 'tu nombre completo y la zona a tratar' },
}

export function getClabeInfo(sucursalNombre) {
  return CLABE_POR_SUCURSAL[sucursalNombre] || null
}

export async function createPreventaPaquete(data) {
  var sucursalId = SUCURSALES[data.sucursal]
  if (!sucursalId) return { success: false, error: 'Sucursal no encontrada' }

  var dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data.fecha)) return { success: false, error: 'Formato de fecha inválido: ' + data.fecha }

  var duracion = getDuracion(data.servicio)
  var tipoServicio = getTipoServicio(data.servicio)

  var startParts = data.hora.split(':')
  var startH = parseInt(startParts[0])
  var startM = parseInt(startParts[1])
  var endMinutes = startH * 60 + startM + duracion
  var endH = Math.floor(endMinutes / 60)
  var endM = endMinutes % 60
  var horaFin = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0')

  var slots = await getAvailableSlots(data.sucursal, data.fecha)
  if (!slots.includes(data.hora)) return { success: false, error: 'Ese horario ya no está disponible' }

  var precioTotal = data.precio_total || 0
  var montoInicial = data.monto_inicial || Math.round(precioTotal / 2)
  var pendiente = precioTotal - montoInicial

  // 1. Crear paquete con campos de preventa
  var paqueteResult = await posSupabase.from('paquetes').insert({
    clienta_nombre: data.nombre || 'Lead WhatsApp',
    sucursal_id: sucursalId,
    sucursal_nombre: data.sucursal,
    servicio: data.servicio || 'Primera sesión',
    precio: precioTotal,
    es_preventa: true,
    preventa_monto_inicial: montoInicial,
    preventa_pendiente: pendiente,
    preventa_fecha_limite: '2026-05-31',
    preventa_liquidado: false,
    preventa_vencida: false,
    activo: true,
    telefono: data.telefono || null,
  }).select().single()

  if (paqueteResult.error) {
    console.error('Error creando paquete preventa:', JSON.stringify(paqueteResult.error))
    return { success: false, error: paqueteResult.error.message }
  }

  var paquete = paqueteResult.data

  // 2. Crear ticket del pago inicial (best-effort)
  try {
    await posSupabase.from('tickets').insert({
      sucursal_id: sucursalId,
      sucursal_nombre: data.sucursal,
      servicios: [data.servicio || 'Primera sesión'],
      total: montoInicial,
      metodo_pago: 'Preventa Hot Sale · Transferencia',
      tipo_clienta: 'Nueva',
      paquete_id: paquete.id,
    })
  } catch (ticketErr) {
    console.error('No se pudo crear ticket preventa (no crítico):', ticketErr)
  }

  // 3. Crear cita ligada al paquete
  var es50Porciento = montoInicial >= precioTotal / 2
  var citaResult = await posSupabase.from('citas').insert({
    clienta_nombre: data.nombre || 'Lead WhatsApp',
    sucursal_id: sucursalId,
    sucursal_nombre: data.sucursal,
    servicio: data.servicio || 'Primera sesión',
    tipo_servicio: tipoServicio,
    duracion_min: duracion,
    fecha: data.fecha,
    hora_inicio: data.hora,
    hora_fin: horaFin,
    sesion_numero: 1,
    es_cobro: false,
    estado: 'agendada',
    paquete_id: paquete.id,
    anticipo_metodo: 'Preventa Hot Sale · Transferencia',
    anticipo_monto: montoInicial,
    notas: 'Preventa Hot Sale · ' + (es50Porciento ? '50% pagado $' + montoInicial : 'Anticipo $' + montoInicial) + ' · Pendiente $' + pendiente + ' · Tel: ' + (data.telefono || 'N/A'),
  }).select().single()

  if (citaResult.error) {
    console.error('Error creando cita preventa:', JSON.stringify(citaResult.error))
    return { success: false, error: citaResult.error.message }
  }

  console.log('Preventa creada — paquete:', paquete.id, '| cita:', citaResult.data.id)
  return { success: true, paquete, cita: citaResult.data }
}

export async function createAppointmentWithAnticipo(data) {
  var sucursalId = SUCURSALES[data.sucursal]
  if (!sucursalId) return { success: false, error: 'Sucursal no encontrada' }

  var dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data.fecha)) return { success: false, error: 'Formato de fecha inválido: ' + data.fecha }

  var duracion = getDuracion(data.servicio)
  var tipoServicio = getTipoServicio(data.servicio)

  var startParts = data.hora.split(':')
  var startH = parseInt(startParts[0])
  var startM = parseInt(startParts[1])
  var endMinutes = startH * 60 + startM + duracion
  var endH = Math.floor(endMinutes / 60)
  var endM = endMinutes % 60
  var horaFin = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0')

  var slots = await getAvailableSlots(data.sucursal, data.fecha)
  if (!slots.includes(data.hora)) return { success: false, error: 'Ese horario ya no está disponible' }

  var insertData = {
    clienta_nombre: data.nombre || 'Lead WhatsApp',
    sucursal_id: sucursalId,
    sucursal_nombre: data.sucursal,
    servicio: data.servicio || 'Primera sesión depilación láser',
    tipo_servicio: tipoServicio,
    duracion_min: duracion,
    fecha: data.fecha,
    hora_inicio: data.hora,
    hora_fin: horaFin,
    sesion_numero: 1,
    es_cobro: false,
    estado: 'agendada',
    anticipo_metodo: 'Anticipo Transferencia',
    anticipo_monto: 200,
    notas: 'Anticipo $200 Transferencia · Pago online · Tel: ' + (data.telefono || 'N/A'),
  }

  console.log('Insertando cita con anticipo en POS:', JSON.stringify(insertData))

  var result = await posSupabase.from('citas').insert(insertData).select().single()

  if (result.error) {
    console.error('Error creando cita con anticipo en POS:', JSON.stringify(result.error))
    return { success: false, error: result.error.message }
  }

  // Crear ticket de anticipo (best-effort, no bloquea si falla)
  try {
    await posSupabase.from('tickets').insert({
      sucursal_id: sucursalId,
      sucursal_nombre: data.sucursal,
      servicios: [data.servicio || 'Primera sesión depilación láser'],
      total: 200,
      metodo_pago: 'Anticipo Transferencia',
      tipo_clienta: 'Nueva',
    })
  } catch (ticketErr) {
    console.error('No se pudo crear ticket de anticipo (no crítico):', ticketErr)
  }

  console.log('Cita con anticipo creada exitosamente:', result.data.id)
  return { success: true, cita: result.data }
}

export async function createAppointment(data) {
  var sucursalId = SUCURSALES[data.sucursal]
  if (!sucursalId) {
    return { success: false, error: 'Sucursal no encontrada' }
  }

  var dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data.fecha)) {
    return { success: false, error: 'Formato de fecha inválido, debe ser YYYY-MM-DD: ' + data.fecha }
  }
  var appointmentDate = new Date(data.fecha + 'T12:00:00')
  var todayMx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  todayMx.setHours(0, 0, 0, 0)
  if (appointmentDate < todayMx) {
    return { success: false, error: 'No se puede agendar en fecha pasada: ' + data.fecha }
  }

  var duracion = getDuracion(data.servicio)
  var tipoServicio = getTipoServicio(data.servicio)

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

  var insertData = {
    clienta_nombre: data.nombre || 'Lead WhatsApp',
    sucursal_id: sucursalId,
    sucursal_nombre: data.sucursal,
    servicio: data.servicio || 'Primera sesión depilación láser',
    tipo_servicio: tipoServicio,
    duracion_min: duracion,
    fecha: data.fecha,
    hora_inicio: data.hora,
    hora_fin: horaFin,
    sesion_numero: 1,
    es_cobro: true,
    estado: 'agendada',
    notas: 'Agendada por WhatsApp Bot - Tel: ' + (data.telefono || 'N/A')
  }

  console.log('Insertando cita en POS:', JSON.stringify(insertData))

  var result = await posSupabase
    .from('citas')
    .insert(insertData)
    .select()
    .single()

  if (result.error) {
    console.error('Error creando cita en POS:', JSON.stringify(result.error))
    return { success: false, error: result.error.message }
  }

  console.log('Cita creada exitosamente:', result.data.id)
  return { success: true, cita: result.data }
}
