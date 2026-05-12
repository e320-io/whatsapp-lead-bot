-- Many-to-many: a lead can have multiple labels
CREATE TABLE IF NOT EXISTS lead_labels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  label_key  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, label_key)
);

CREATE INDEX IF NOT EXISTS lead_labels_lead_id_idx ON lead_labels(lead_id);

ALTER TABLE lead_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON lead_labels
  FOR ALL USING (true) WITH CHECK (true);

-- Migrate existing single-label data
INSERT INTO lead_labels (lead_id, label_key)
SELECT id, label
FROM leads
WHERE label IS NOT NULL AND label != ''
ON CONFLICT DO NOTHING;
