-- Tabla para prevenir procesamiento duplicado de webhooks de WhatsApp
-- Meta a veces envía el mismo webhook dos veces; esto garantiza atomicidad
create table if not exists processing_locks (
  message_id text primary key,
  created_at timestamptz default now()
);

-- Limpiar locks viejos automáticamente (más de 10 minutos = ya terminaron)
create or replace function cleanup_old_processing_locks() returns void language sql as $$
  delete from processing_locks where created_at < now() - interval '10 minutes';
$$;
