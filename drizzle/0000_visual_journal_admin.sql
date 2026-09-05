CREATE TABLE IF NOT EXISTS journeys (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '', intro TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  hero_photo_id TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY, journey_id TEXT NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  UNIQUE (journey_id, slug)
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY, journey_id TEXT NOT NULL, chapter_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime_type TEXT NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, alt TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '', layout_type TEXT NOT NULL DEFAULT 'single',
  layout_group TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS chapters_journey_position_idx ON chapters(journey_id, position);
CREATE INDEX IF NOT EXISTS photos_chapter_position_idx ON photos(chapter_id, position);
