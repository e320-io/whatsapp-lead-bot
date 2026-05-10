-- Desactivar sucursal Santa Fe (no existe)
UPDATE branches
SET is_active = false
WHERE id = '0a8cc7ff-66ab-4258-a4b2-4c0da8578975';

-- Corregir dirección Polanco
UPDATE branches
SET address = 'Gutenberg 194, Anzures, Miguel Hidalgo, 11590 CDMX'
WHERE id = '52f20328-795f-4fc8-83f6-4e6be7e4254d';

-- Corregir dirección Valle (Del Valle)
UPDATE branches
SET address = 'Cda. Dr. José Ignacio Bartolache 1038-INTERIOR 1, Col del Valle Centro, Benito Juárez, 03100 CDMX'
WHERE id = 'd6a17666-0dd9-4eec-aeee-8ffe021b118a';

-- Corregir dirección Coapa
UPDATE branches
SET address = 'Calz. del Hueso 453-Local 19 primer piso, Coapa, Los Girasoles, Coyoacán, 04920 CDMX'
WHERE id = '98855586-500a-40f7-90d3-7461ba5269e8';

-- Corregir dirección Oriente
UPDATE branches
SET address = 'Río Tacámbaro 56-Interior 2, Paseos de Churubusco, Iztapalapa, 09030 CDMX'
WHERE id = '134c00fc-926e-4a6a-8f70-b3636f1b50e1';

-- Corregir dirección Metepec
UPDATE branches
SET address = 'C. Adolfo López Mateos 1100-Local 10-A, La Asunción, 52172 San Salvador Tizatlalli, Méx.'
WHERE id = '9e915a27-d1ee-47f9-a987-4a7911c09013';
