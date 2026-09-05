ALTER TABLE journeys ADD COLUMN year INTEGER;
UPDATE journeys SET year = 2026 WHERE slug = 'japan' AND year IS NULL;
