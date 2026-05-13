-- Tracking de entrega de mensajes salientes via callbacks de Meta
-- delivery_status: null (pendiente), 'sent', 'delivered', 'read', 'failed'
-- delivery_error: motivo del fallo si status = 'failed' (ej: "outside 24h window")

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_error text;
