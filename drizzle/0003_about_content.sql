CREATE TABLE IF NOT EXISTS about_content (
  id TEXT PRIMARY KEY,
  intro_heading TEXT NOT NULL,
  intro_body TEXT NOT NULL,
  approach_heading TEXT NOT NULL,
  approach_body TEXT NOT NULL,
  gear TEXT NOT NULL,
  instagram_url TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO about_content (
  id, intro_heading, intro_body, approach_heading, approach_body, gear, instagram_url
) VALUES (
  'about',
  'I''m Prathik—a photographer collecting small observations from the road.',
  'This site is a home for the moments that sit between destinations: changing light, passing gestures, and everyday places with a story of their own.',
  'Slow looking.
Honest frames.',
  'I work lightly and intuitively, usually with one camera and no fixed shot list. The aim is not to make a place look perfect, but to notice what makes it particular.

I''m drawn to natural light, quiet colour, and photographs that leave room for the viewer.',
  'Mirrorless camera
35mm prime
Small notebook
Comfortable shoes',
  'https://instagram.com'
);
