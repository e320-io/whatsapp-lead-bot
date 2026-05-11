create table if not exists labels (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  label text not null,
  emoji text not null default '',
  color text not null default '#6b7280',
  created_at timestamptz default now()
);

alter table labels enable row level security;

create policy "Service role full access on labels" on labels
  for all using (auth.role() = 'service_role');

insert into labels (key, label, emoji, color) values
  ('pedido_completado', 'Pedido completado', '', '#5B21B6'),
  ('viene_a_pagar', 'viene a pagar', '', '#16A34A'),
  ('seguimiento', 'seguimiento', '🔥', '#2563EB'),
  ('sin_interes', 'sin interes', '🙂', '#6B7280'),
  ('importante', 'importante', '❗', '#65A30D'),
  ('polanco', 'Polanco', '', '#111827'),
  ('hifu_corporal', 'Hifu corporal', '🍑', '#D97706'),
  ('hifu_lifting', 'HIFU/lifting', '🧖', '#92400E'),
  ('cuerpo_completo', 'cuerpo completo', '🧖', '#374151'),
  ('corporales', 'corporales', '🍑', '#7C3AED'),
  ('combos', 'combos', '👙🧖', '#EC4899'),
  ('bikinis', 'bikinis', '👙', '#9F1239'),
  ('axilas_y_otros', 'axilas y otros', '👩', '#10B981'),
  ('faciales', 'faciales', '🧖', '#DB2777'),
  ('cera', 'cera', '🕯️', '#6D28D9'),
  ('cliente_dv', 'cliente DV', '⭐', '#0891B2'),
  ('nuevo_pedido', 'nuevo pedido', '', '#8B5CF6')
on conflict (key) do nothing;
