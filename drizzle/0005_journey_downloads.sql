ALTER TABLE journeys ADD COLUMN allow_downloads INTEGER NOT NULL DEFAULT 1 CHECK (allow_downloads IN (0, 1));
