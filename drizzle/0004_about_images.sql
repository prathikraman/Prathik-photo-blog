CREATE TABLE IF NOT EXISTS about_images (
  slot TEXT PRIMARY KEY CHECK (slot IN ('portrait', 'secondary')),
  id TEXT NOT NULL UNIQUE, object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  alt TEXT NOT NULL DEFAULT ''
);
