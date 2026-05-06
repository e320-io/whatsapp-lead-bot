create table if not exists quick_replies (
  id uuid primary key default gen_random_uuid(),
  shortcut text not null unique,
  content text not null,
  created_at timestamptz default now()
);

insert into quick_replies (shortcut, content) values
('hola', 'Hola buen dia!🤍✨🌸 estoy feliz de saludarte! te atiende *𝗖𝗮𝗿𝗹𝗮, 𝗱𝗲 𝗖𝗶𝗿𝗲 𝗗𝗲𝗽𝗶𝗹𝗮𝗰𝗶𝗼́𝗻*!
Platícame con quien tengo el gusto y en qué sucursal te gustaría realizarte tu tratamiento, *𝗗𝗲𝗹 𝗩𝗮𝗹𝗹𝗲 𝗼 𝗣𝗼𝗹𝗮𝗻𝗰𝗼* ? en breve te comparto las promos, si tienes alguna duda con gusto estoy apoyandote!👩🏻‍💻💞'),
('indicaciones', 'Indicaciones que debes considerar para poder iniciar tu depilación con *𝗹𝗮́𝘀𝗲𝗿 𝗱𝗶𝗼𝗱𝗼 𝗲𝗻 𝗖𝗜𝗥𝗘 𝗗𝗘𝗣𝗜𝗟𝗔𝗖𝗜𝗢́𝗡*:
❌ *𝗗𝗘𝗝𝗔𝗥 𝗗𝗘 𝗨𝗦𝗔𝗥* otros métodos de depilación de *𝗮𝗿𝗿𝗮𝗻𝗾𝘂𝗲* como lo son: *𝗽𝗶𝗻𝘇𝗮𝘀, 𝗰𝗲𝗿𝗮*, etc, por lo menos 30 días antes de tu primera sesión.
⚠️ INFORMARNOS si estás en algún *𝘁𝗿𝗮𝘁𝗮𝗺𝗶𝗲𝗻𝘁𝗼 𝗺𝗲́𝗱𝗶𝗰𝗼*, ya que algunos medicamentos pueden generar fotosensibilidad.
🚫 EVITAR realizarte *𝗽𝗲𝗲𝗹𝗶𝗻𝗴𝘀, 𝗲𝘅𝗳𝗼𝗹𝗶𝗮𝗰𝗶𝗼𝗻𝗲𝘀 𝗽𝗿𝗼𝗳𝘂𝗻𝗱𝗮𝘀, 𝘂𝘀𝗮𝗿 𝗽𝗿𝗼𝗱𝘂𝗰𝘁𝗼𝘀 𝗰𝗼𝗻 𝗮́𝗰𝗶𝗱𝗼 𝗴𝗹𝗶𝗰𝗼́𝗹𝗶𝗰𝗼 𝗼 𝗿𝗲𝘁𝗶𝗻𝗼𝗶𝗰𝗼*, autobronceadores por lo menos 15 días antes de tu sesión.
🔅 EVITAR *𝗮𝗰𝘂𝗱𝗶𝗿 𝗯𝗿𝗼𝗻𝗰𝗲𝗮𝗱𝗮*, si éste es el caso deberás esperar por lo menos 15 días antes de tu sesión.
🩸 Sí puedes asistir en tu *𝗽𝗲𝗿𝗶𝗼𝗱𝗼 𝗺𝗲𝗻𝘀𝘁𝗿𝘂𝗮𝗹* aunque la zona a depilar es bikini 👙 o si es cualquier otra *𝘇𝗼𝗻𝗮 𝗮 𝗱𝗲𝗽𝗶𝗹𝗮𝗿*, solo podrías estar más sensible, en caso de bikini, venir aseada y con tampón.
🚫EVITAR USAR LOS SIGUIENTES PRODUCTOS *𝗜𝗡𝗚𝗘𝗥𝗜𝗗𝗢𝗦*:
-𝗔́𝗰𝗶𝗱𝗼 𝗴𝗹𝗶𝗰𝗼́𝗹𝗶𝗰𝗼
-𝗔́𝗰𝗶𝗱𝗼 𝘀𝗮𝗹𝗶𝗰𝗶́𝗹𝗶𝗰𝗼
-𝗧𝗿𝗲𝘁𝗶𝗻𝗼𝗶𝗻𝗮 (𝗥𝗲𝘁𝗶𝗻-𝗔)
(En el caso de utilizarlos de manera *𝘁𝗼́𝗽𝗶𝗰𝗮* suspéndelo 5 días)'),
('comovenir', '*𝗖𝗼́𝗺𝗼 𝗱𝗲𝗯𝗲𝘀 𝗮𝘀𝗶𝘀𝘁𝗶𝗿 𝗮 𝘁𝘂 𝘀𝗲𝘀𝗶𝗼́𝗻:*
🪒 *𝗥𝗮𝘀𝘂𝗿𝗮𝗿* la(s) zona(s) el mismo día o 1 día de anticipación dependiendo qué tan rápido crezca tu vello, el vello no debe sobre salir de la piel.
🧼 Debes venir con la(s) zona(s) completamente *𝗹𝗶𝗺𝗽𝗶𝗮𝘀*, no usar *𝗰𝗿𝗲𝗺𝗮* o *𝗱𝗲𝘀𝗼𝗱𝗼𝗿𝗮𝗻𝘁𝗲*, no usar maquillaje y deberás evitar por completo el uso de cremas autobronceadoras.
⚠️ Si estás tomando algún *𝗺𝗲𝗱𝗶𝗰𝗮𝗺𝗲𝗻𝘁𝗼*, deberás informar a nuestra cosmetóloga o por este medio
🩸 Sí puedes asistir en tu *𝗽𝗲𝗿𝗶𝗼𝗱𝗼 𝗺𝗲𝗻𝘀𝘁𝗿𝘂𝗮𝗹* aunque la zona a depilar es bikini 👙 o si es cualquier otra *𝘇𝗼𝗻𝗮 𝗮 𝗱𝗲𝗽𝗶𝗹𝗮𝗿*, solo podrías estar más sensible, en caso de bikini, venir aseada y con tampón.
Si es cualquier otra *𝘇𝗼𝗻𝗮* a depilar, podrás asistir a tu sesión, solo toma en cuenta que podrás estar más sensible
🔅 No se puede realizar la sesión en *𝗽𝗶𝗲𝗹 𝗯𝗿𝗼𝗻𝗰𝗲𝗮𝗱𝗮*'),
('confirmacion', 'Hola! 👋🏻 Buenas tardes ❣️
Te contacto de *𝗖𝗜𝗥𝗘 𝗗𝗘𝗣𝗜𝗟𝗔𝗖𝗜𝗢́𝗡*
📆 Confirmando tu cita depilación con *𝙇𝙖́𝙨𝙚𝙧 𝘿𝙞𝙤𝙙𝙤* el día de mañana a las
Recuerda: 🗒️
• Debes venir con la zona(s) completamente *𝗿𝗮𝘀𝘂𝗿𝗮𝗱𝗮 𝘆 𝗹𝗶𝗺𝗽𝗶𝗮*.
• Si estás tomando algún *𝗺𝗲𝗱𝗶𝗰𝗮𝗺𝗲𝗻𝘁𝗼*, deberás informar a nuestra cosmetóloga o por este medio.
• 🩸 Sí puedes asistir en tu *𝗽𝗲𝗿𝗶𝗼𝗱𝗼 𝗺𝗲𝗻𝘀𝘁𝗿𝘂𝗮𝗹* aunque la zona a depilar es bikini 👙 o si es cualquier otra *𝘇𝗼𝗻𝗮 𝗮 𝗱𝗲𝗽𝗶𝗹𝗮𝗿*, solo te comentamos que podrías estar más sensible, en caso de bikini, venir aseada y con tampón.
• Si no asistes a tu sesión, se tomará como *𝗮𝘀𝗶𝘀𝘁𝗶𝗱𝗮 𝘆 𝗽𝗲𝗿𝗱𝗲𝗿𝗮́𝘀 𝗹𝗮 𝗺𝗶𝘀𝗺𝗮*.
• Contamos con todas las medidas sanitarias y de seguridad para tu tranquilidad.
Agradezco tu *𝗖𝗢𝗡𝗙𝗜𝗥𝗠𝗔𝗖𝗜𝗢́𝗡* o si no puedes asistir, indícanos el día y la hora en la que te gustaría reagendar con al menos 12 hrs de anticipación (antes de las 8pm de un día antes).'),
('cancelaciones', 'Te recordamos que las *𝗰𝗮𝗻𝗰𝗲𝗹𝗮𝗰𝗶𝗼𝗻𝗲𝘀* son con *𝟭𝟮 𝗵𝗼𝗿𝗮𝘀 𝗱𝗲 𝗮𝗻𝘁𝗶𝗰𝗶𝗽𝗮𝗰𝗶𝗼́𝗻* (horario para cancelar Máximo 8 pm del día anterior)
Tienes *𝟭𝟱 𝗺𝗶𝗻𝘂𝘁𝗼𝘀* de tolerancia en caso de Cuerpos completos, combos, y/o zonas amplias.
Y *𝟱 𝗺𝗶𝗻𝘂𝘁𝗼𝘀* de tolerancia en caso de zonas chicas como: rostro, axilas, bigote, etc.
Tienes *𝟱 𝗺𝗶𝗻𝘂𝘁𝗼𝘀* de tolerancia si tu cita es a las 7:00 o 7:30 pm.
Toma tus precauciones (tráfico, parquímetro, etc)
Cita *𝗰𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝗱𝗮* y *𝗻𝗼 𝗮𝘀𝗶𝘀𝘁𝗶𝗱𝗮* se toma como servicio efectuado
Solo se puede *𝗿𝗲𝗮𝗴𝗲𝗻𝗱𝗮𝗿 𝗨𝗡𝗔 𝗩𝗘𝗭* (si no estás segura de tu cita, puedes dejar abierta tu cita)
*𝗦𝗮́𝗯𝗮𝗱𝗼𝘀* el tiempo de tolerancia es de *𝟱 𝗺𝗶𝗻𝘂𝘁𝗼𝘀* y tiempo límite para reagendar o cancelar es *𝟰𝟴𝗵𝗿𝘀 𝗮𝗻𝘁𝗲𝘀* de tu cita.'),
('bikini', '¿Que tipo de 𝗕𝗶𝗸𝗶𝗻𝗶 te interesa?💞👙✨
• *𝗕𝗶𝗸𝗶𝗻𝗶 𝗕𝗮́𝘀𝗶𝗰𝗼*: limpieza de inglés y delineado superior de ropa interior
• *𝗦𝗲𝘅𝘆 𝗕𝗶𝗸𝗶𝗻𝗶*: 2 cm más adentro de las inglés
• *𝗙𝗿𝗲𝗻𝗰𝗵 𝗕𝗶𝗸𝗶𝗻𝗶*: sin vello en pubis, labios e ingles
• *𝗕𝗶𝗸𝗶𝗻𝗶 𝗕𝗿𝗮𝘇𝗶𝗹𝗶𝗮𝗻*: sin vello en pubis, labios, ingles y crack'),
('cuentame', 'Cuéntame.. en qué zonas deseas *eliminar* tus vellitos de forma permanente? 🍓🪒
𝟭. 𝗥𝗼𝘀𝘁𝗿𝗼
𝟮. 𝗕𝗿𝗮𝘇𝗼𝘀
𝟯. 𝗔𝘅𝗶𝗹𝗮𝘀
𝟰. 𝗔𝗯𝗱𝗼𝗺𝗲𝗻
𝟱. 𝗣𝗶𝗲𝗿𝗻𝗮𝘀
𝟲. 𝗕𝗶𝗸𝗶𝗻𝗶
𝟳. 𝗚𝗹𝘂́𝘁𝗲𝗼𝘀
𝟴. 𝗘𝘀𝗽𝗮𝗹𝗱𝗮
𝟵. 𝗧𝗼𝗱𝗮𝘀 𝗹𝗮𝘀 𝗮𝗻𝘁𝗲𝗿𝗶𝗼𝗿𝗲𝘀'),
('beneficioshifu', 'El HIFU✅✨ es la clave para remodelar tu rostro y cuerpo, atacando la flacidez desde el interior con una precisión inigualable.😌☝🏻
✨ ¿Qué te ofrece una Sesión de HIFU?
Imagina un efecto lifting que no requiere bisturí ni tiempo de inactividad. El HIFU utiliza energía de ultrasonido enfocada para penetrar las capas profundas de la piel, alcanzando la capa del SMAS (Sistema Musculoaponeurótico Superficial), la misma capa que se trata en una cirugía de lifting.
Esta energía provoca una micro-lesión térmica controlada, que tiene dos efectos principales:
*Contracción Inmediata*: La energía térmica tensa instantáneamente las fibras de colágeno existentes, lo que ya proporciona un ligero efecto de elevación.
*Neocolagénesis (Regeneración)*: Este calentamiento profundo desencadena una respuesta natural de curación en tu cuerpo, estimulando la producción de nuevo y robusto colágeno y elastina durante los siguientes meses.'),
('beneficioslaser', 'Beneficios de la depilación láser 🥳✨
✅ Es cómodo.
✅ Es seguro y rápido.
✅ Acaba con la foliculitis (vello enquistado) y el exceso de vello
✅ Aporta libertad e higiene.
✅ Sirve para todo tipo de vello y de personas.
✅ No duele. Es normal una sensación de ligeros piquetitos y/o calor.
✅ Suaviza la piel.
✅ Blanquea zonas oscurecidas y manchas'),
('sucursales', 'Contamos con 5 sucursales 📍🚗
• Del Valle
• Polanco
• Oriente
• Coapa
• Metepec'),
('horario', 'Nuestro horario es de *lunes a viernes de 10 am a 8 pm* y los *sábados de 9 am a 4* pm
Nuestro horario comercial es el siguiente:
Lunes: 10:00 - 20:00
Martes: 10:00 - 20:00
Miércoles: 10:00 - 20:00
Jueves: 10:00 - 20:00
Viernes: 10:00 - 20:00
Sábado: 9:00 - 16:00
Domingo: Cerrado'),
('tarjetas', '*𝙏𝙖𝙧𝙟𝙚𝙩𝙖𝙨 𝙥𝙖𝙧𝙩𝙞𝙘𝙞𝙥𝙖𝙣𝙩𝙚𝙨 💳* *𝘀𝗲 𝗿𝗲𝗾𝘂𝗶𝗲𝗿𝗲 𝗽𝗿𝗲𝘀𝗲𝗻𝘁𝗮𝗿 𝗹𝗮 𝘁𝗮𝗿𝗷𝗲𝘁𝗮 𝗳𝗶́𝘀𝗶𝗰𝗮*
Hasta 9 MSI (dependiendo el monto) BBVA AMEX, Afirme, Banbajio, Banorte IXE, Banjercito, HSBC, Banregio, Invex, Inbursa, Banca Mifel, Liverpool Visa, Scotiabank, Santander, Banco Azteca, Falabella Soriana, Konfío, Multiva.
• 𝘽𝙖𝙣𝙖𝙢𝙚𝙭, 𝙉𝙐 💳: Sólo aplica 3 MSI'),
('garantia', 'DEPILACIÓN PERMANENTE CON LÁSER DIODO Y NUESTRA GARANTÍA ❣️
Nuestro láser diodo produce efectos que permanecen en el vello presente al iniciar las sesiones, los resultados se podrán ver desde la primer sesión.
La garantía que ofrecemos en CIRE DEPILACIÓN es que contamos con equipos de la más ALTA CALIDAD para realizar estos procedimientos por lo tanto tenemos una mayor tasa de efectividad en la eliminación del vello en 6 u 8 sesiones en mujeres y hasta 10 sesiones para hombres, dependiendo cuál sea el caso.
En caso de condiciones tales como hirsutismo, ovario poliquístico etc, la depilación láser puede ser una gran opción para la disminución y eliminación de vello ofreciendo resultados progresivos desde la primer sesión. Será importante considerar que debido a los cambios hormonales provocados por dichas condiciones, pueden ser necesarias más de 8 sesiones o sesiones de retoque una vez concluido su tratamiento inicial.'),
('facial', 'Platícame que te parece? 🧖🏻‍♀️✨Cada sesion es personalizada dependiendo de las necesidades de tu rostro , además de aplicar aparatologia de alta gama ✅para garantizar y promover la salud de tu piel ☺️☝🏻'),
('cuidadoslaser', 'Cuidados Posteriores láser:⭐
Evitar exposición al sol y rayos UVA.
Empleo de FOTOPROTECTORES.
Evitar exponerse a calor, sauna, SPA, jacuzzi, ni realizar ejercicios vigorosos.
Evitar baños de piscina durante 48 hrs.
No usar jabones agresivos durante 48 hrs.
No depilar con cera ni pinzas la zona tratada.
No rascar ni tocar la zona tratada.
*CONTRAINDICACIONES ABSOLUTAS:⚠️*
Exposición continua al sol.
Dermatitis, alergias, enfermedades de la piel.
Tratamiento con isotretina oral.
Embarazo y lactancia.'),
('faciales', 'Tenemos 2 tipos de limpieza facial, ambas pensadas para dejar tu piel súper limpia, luminosa y saludable ✨
*🌿 Baby clean*
Ideal para mantener tu piel limpia y fresca
Incluye: limpieza profunda, exfoliación, extracción y mascarilla
*✨ Full Face*
Perfecta si tienes puntos negros, acné o quieres un resultado más completo
Incluye todo lo anterior + aparatología y tratamiento más intensivo
💬 Cuéntame, ¿qué te gustaría mejorar de tu piel? (manchitas, acné, grasa, resequedad…) para recomendarte la mejor opción 💕'),
('anticipo', 'Información para agendar: 🌟🩷Te comentamos que afortunadamente tenemos la agenda saturada, Para garantizar tu cita deberás realizar un apartado de $250 *𝗽𝗼𝗿 𝗱𝗲𝗽𝗼́𝘀𝗶𝘁𝗼 𝗼 𝘁𝗿𝗮𝗻𝘀𝗳𝗲𝗿𝗲𝗻𝗰𝗶𝗮* a la siguiente cuenta:
(mismos que se toman a cuenta de tu pago final)
👉🏻Si por alguna razón debes re agendar la fecha acordada, cuentas con *𝟭𝟮 𝗵𝗼𝗿𝗮𝘀 𝗽𝗿𝗲𝘃𝗶𝗮𝘀* a la misma para re agendar, 𝙙𝙚 𝙡𝙤 𝙘𝙤𝙣𝙩𝙧𝙖𝙧𝙞𝙤 𝙙𝙞𝙘𝙝𝙤 𝙖𝙥𝙖𝙧𝙩𝙖𝙙𝙤 𝙨𝙚 𝙥𝙞𝙚𝙧𝙙𝙚 𝙮 𝙙𝙚𝙗𝙚𝙧𝙖́𝙨 𝙧𝙚𝙖𝙡𝙞𝙯𝙖𝙧 𝙪𝙣𝙤 𝙣𝙪𝙚𝙫𝙤 𝙥𝙖𝙧𝙖 𝙖𝙜𝙚𝙣𝙙𝙖𝙧.
Puedes re agendar una vez.
*𝗗𝗔𝗧𝗢𝗦 𝗣𝗔𝗥𝗔 𝗧𝗥𝗔𝗡𝗦𝗙𝗘𝗥𝗜𝗥*
*𝗕𝗔𝗡𝗖𝗢𝗠𝗘𝗥 🪪*
*𝗖𝗶𝗿𝗲 𝗗𝗲𝗽𝗶𝗹𝗮𝗰𝗶𝗼́𝗻 𝗦𝗮𝘀 𝗱𝗲 𝗖𝗩*
# CUENTA 0124923510
CUENTA CLABE 012180001249235103
*IMPORTANTE✨*
En el concepto deberás poner 𝙎𝙀𝙍𝙑𝙄𝘾𝙄𝙊 𝘿𝙀 DEPILACIÓN 👈🏻
Manda foto o captura de pantalla de tu comprobante.
Si tienes dudas, escríbeme, con gusto te ayudaré 🗒️ 👩🏻‍💻'),
('indicacioneshifu', 'Indicaciones que debes considerar para poder iniciar tu tratamiento HIFU4D en CIRE DEPILACIÓN:
❌ NO TENER *BOTOX, ÁCIDO HIALURONICO, HILOS TENSORES* por lo menos 6-8 meses antes de tu sesión.
El efecto será que disuelva el bótox o los hilos, por la profundidad que llega el HIFU.
⚠️ INFORMARNOS si estás en algún tratamiento médico, *diabetes, lupus, enfermedades del corazón*.
🚫 EVITAR realizarte *peelings, exfoliaciones profundas, usar productos con ácido glicólico o retinoico*, autobronceadores por lo menos 15 días antes de tu sesión.
🔅 EVITAR acudir *bronceada*, si éste es el caso deberás esperar por lo menos 15 días antes de tu sesión.
*🚫NO SE PUEDEN USAR LOS SIGUIENTES PRODUCTOS TÓPICOS:*
-Ácido glicólico
-Ácido salicílico
-Tretinoina (Retin-A), Adalpaleno'),
('seguimiento', 'Holaaa! Buen día, como estas ?🤍✨☺️soy Carla de Cire del valle, te mando mensajito por que recuerdo tu interés en iniciar tu tratamiento de depilación laser, te gustaría que te diera seguimiento respetándo la promo que te ofrecí? 🙌🏻✨'),
('anticipohifu', 'Información para agendar: 🌟🩷Te comentamos que afortunadamente tenemos la agenda saturada, Para garantizar tu cita deberás realizar un apartado de *$𝟮𝟬𝟬 𝗽𝗼𝗿 𝗱𝗲𝗽𝗼́𝘀𝗶𝘁𝗼 𝗼 𝘁𝗿𝗮𝗻𝘀𝗳𝗲𝗿𝗲𝗻𝗰𝗶𝗮* a la siguiente cuenta:
(mismos que se toman a cuenta de tu pago final)
👉🏻Si por alguna razón debes re agendar la fecha acordada, cuentas con *𝟭𝟮 𝗵𝗼𝗿𝗮𝘀 𝗽𝗿𝗲𝘃𝗶𝗮𝘀* a la misma para re agendar, 𝙙𝙚 𝙡𝙤 𝙘𝙤𝙣𝙩𝙧𝙖𝙧𝙞𝙤 𝙙𝙞𝙘𝙝𝙤 𝙖𝙥𝙖𝙧𝙩𝙖𝙙𝙤 𝙨𝙚 𝙥𝙞𝙚𝙧𝙙𝙚 𝙮 𝙙𝙚𝙗𝙚𝙧𝙖́𝙨 𝙧𝙚𝙖𝙡𝙞𝙯𝙖𝙧 𝙪𝙣𝙤 𝙣𝙪𝙚𝙫𝙤 𝙥𝙖𝙧𝙖 𝙖𝙜𝙚𝙣𝙙𝙖𝙧.
Puedes re agendar una vez.
*𝗗𝗔𝗧𝗢𝗦 𝗣𝗔𝗥𝗔 𝗧𝗥𝗔𝗡𝗦𝗙𝗘𝗥𝗜𝗥*
*𝗕𝗔𝗡𝗖𝗢𝗠𝗘𝗥 🪪*
*𝗖𝗶𝗿𝗲 𝗗𝗲𝗽𝗶𝗹𝗮𝗰𝗶𝗼́𝗻 𝗦𝗮𝘀 𝗱𝗲 𝗖𝗩*
# CUENTA 0124923510
CUENTA CLABE 012180001249235103
*IMPORTANTE✨*
En el concepto deberás poner 𝙎𝙀𝙍𝙑𝙄𝘾𝙄𝙊 𝘿𝙀 HIFU 👈🏻
Manda foto o captura de pantalla de tu comprobante.
Si tienes dudas, escríbeme, con gusto te ayudaré 🗒️ 👩🏻‍💻'),
('ultimosdias', 'hola lindo dia! 🌸✨como estas? soy carla de cire del valle🫶🏻✨, me da gusto saludarte nuevamente preciosa, te mando mensaje solo para platicarte que son los ultimos dias de nuestra promo y recuerdo de tu interes en iniciar tu tratamiento , deseas que te brinde seguimiento y te apoye en todas tus dudas?☺️'),
('cuestionariohifu', '🤓☝🏻Cuestionario para Hifu:
¿Padeces diabetes?
¿Consumes algún medicamento de manera permanente ?
¿Te has realizado alguna infiltración en los últimos 3 meses?
¿Tienes alguna placa de metal, marcapasos o aparato auditivo ?
¿Estás en algún tratamiento dermatológico?'),
('cuidadoshifu', '*Cuidados post HIFU 4D*
💆🏻‍♀️Se recomienda una mascarilla descongestiva e hidratante postratamiento.
☀️Posteriormente utilice una crema de valor hidratanete y con factor de protección SPF30+ para salir a la calle.
❌Prohibido aplicar posterior al tratamiento; agua caliente, baños de sol, sauna o cualquier tipo de peeling.
🍾Evite las bebidas alcohólicas y las comidas picantes a ser posible.
🧖🏻‍♀️Cuide posteriormemente la piel con cosméticos adecuados para la misma, sobre todo hidratantes.
🧏🏻‍♀️Puede intercalar sesiones de Mesoterapia / Radiofrecuencia, botox, ácido hialuronico, hilos tensores, 1 mes posterior al tratamiento'),
('venta', 'Hola 🤍✨como estas?☺️ te escribe Carla de CIRE Del Valle,  me alegra poder saludarte de nuevo, te mando mensajito por que recuerdo que tenias interes en iniciar tu tratamiento de depilacion laser diodo, te gustaria que te diera seguimiento y te comparta las promociones ?'),
('indicacionescorporal', '🌸 𝙄𝙣𝙙𝙞𝙘𝙖𝙘𝙞𝙤𝙣𝙚𝙨 𝙥𝙖𝙧𝙖 𝙞𝙣𝙘𝙞𝙖𝙧 𝙩𝙪 𝙩𝙧𝙖𝙩𝙖𝙢𝙞𝙚𝙣𝙩𝙤 𝙙𝙚 𝙈𝙤𝙡𝙙𝙚𝙤 𝙚𝙣 𝘾𝙞𝙧𝙚 🌸
Para brindarte un tratamiento seguro y con mejores resultados, te compartimos las siguientes indicaciones💖
*✅ Indicaciones*
*🫀 Salud general*
Es importante encontrarte en buen estado de salud y no presentar enfermedades no controladas o crónicas que puedan interferir con el tratamiento.
*💧🍎 Hidratación y alimentación*
Te recomendamos tomar al menos 2 litros de agua al día y mantener una alimentación baja en grasas, azúcares y sodio para favorecer la eliminación de grasa y toxinas.
*🧘🏻 Actividad física*
Realizar ejercicio de forma regular, especialmente cardiovascular, ayuda a potenciar y mantener los resultados.
✨ Si actualmente estás en algún tratamiento médico, padeces alguna enfermedad o alergia, por favor infórmanos antes de tu sesión.
*🚫 Contraindicaciones*
*🦾🦿 Dispositivos electrónicos o implantes metálicos*
No se puede realizar el tratamiento si cuentas con marcapasos, desfibriladores, prótesis metálicas.')
on conflict (shortcut) do nothing;
