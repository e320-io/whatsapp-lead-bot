-- Migración de etapas del pipeline kanban a nuevos nombres de columna
--
-- nuevo              → sin_respuesta      (lead nuevo sin respuesta del bot aún)
-- en_conversacion    → sin_respuesta      (aún conversando con el bot, no está listo)
-- notificacion_sucursal → esperando_respuesta (bot mandó alerta, lead listo para agendar)
-- anticipo_tomado    → cita_agendada
-- cita_agendada      → sin cambio
-- escalado           → seguimiento
-- no_interesado      → sin cambio

UPDATE leads SET stage = 'sin_respuesta'        WHERE stage = 'nuevo';
UPDATE leads SET stage = 'sin_respuesta'        WHERE stage = 'en_conversacion';
UPDATE leads SET stage = 'esperando_respuesta'  WHERE stage = 'notificacion_sucursal';
UPDATE leads SET stage = 'cita_agendada'        WHERE stage = 'anticipo_tomado';
UPDATE leads SET stage = 'seguimiento'          WHERE stage = 'escalado';
