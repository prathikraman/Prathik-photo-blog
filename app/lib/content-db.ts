import type { EditorialBlock, Journey, Photo } from "../types";
import { japanJourney } from "../data";
import { getPlatformEnv, type D1Database } from "./platform";

export type AdminPhoto = {
  id: string; journey_id: string; chapter_id: string; original_name: string; mime_type: string;
  width: number; height: number; alt: string; caption: string; layout_type: EditorialBlock["type"];
  layout_group: string; position: number; story_title: string; story_body: string;
  story_alignment: "left" | "right"; src: string;
};
export type AdminChapter = { id: string; journey_id: string; slug: string; title: string; note: string; position: number; photos: AdminPhoto[] };
export type AdminJourney = {
  id: string; slug: string; title: string; year: number | null; meta: string; intro: string;
  status: "draft" | "published"; hero_photo_id: string | null; chapters: AdminChapter[];
};
export type AboutContent = {
  intro_heading: string; intro_body: string; approach_heading: string;
  approach_body: string; gear: string; instagram_url: string;
};

export const defaultAboutContent: AboutContent = {
  intro_heading: "I'm Prathik—a photographer collecting small observations from the road.",
  intro_body: "This site is a home for the moments that sit between destinations: changing light, passing gestures, and everyday places with a story of their own.",
  approach_heading: "Slow looking.\nHonest frames.",
  approach_body: "I work lightly and intuitively, usually with one camera and no fixed shot list. The aim is not to make a place look perfect, but to notice what makes it particular.\n\nI'm drawn to natural light, quiet colour, and photographs that leave room for the viewer.",
  gear: "Mirrorless camera\n35mm prime\nSmall notebook\nComfortable shoes",
  instagram_url: "https://instagram.com",
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS journeys (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, year INTEGER, meta TEXT NOT NULL DEFAULT '',
    intro TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    hero_photo_id TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, journey_id TEXT NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE, UNIQUE (journey_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY, journey_id TEXT NOT NULL, chapter_id TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL, mime_type TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    alt TEXT NOT NULL DEFAULT '', caption TEXT NOT NULL DEFAULT '', layout_type TEXT NOT NULL DEFAULT 'single',
    layout_group TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, story_title TEXT NOT NULL DEFAULT '',
    story_body TEXT NOT NULL DEFAULT '', story_alignment TEXT NOT NULL DEFAULT 'right',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS about_content (
    id TEXT PRIMARY KEY, intro_heading TEXT NOT NULL, intro_body TEXT NOT NULL,
    approach_heading TEXT NOT NULL, approach_body TEXT NOT NULL, gear TEXT NOT NULL,
    instagram_url TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  "CREATE INDEX IF NOT EXISTS chapters_journey_position_idx ON chapters(journey_id, position)",
  "CREATE INDEX IF NOT EXISTS photos_chapter_position_idx ON photos(chapter_id, position)",
];

export function getDb(): D1Database {
  const db = getPlatformEnv().DB;
  if (!db) throw new Error("The photo database binding is unavailable.");
  return db;
}

export async function ensureContentSchema(db = getDb()) {
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const journeyColumns = (await db.prepare("PRAGMA table_info(journeys)").all<{ name: string }>()).results;
  if (!journeyColumns.some((column) => column.name === "year")) {
    await db.prepare("ALTER TABLE journeys ADD COLUMN year INTEGER").run();
  }
  const photoColumns = (await db.prepare("PRAGMA table_info(photos)").all<{ name: string }>()).results;
  if (!photoColumns.some((column) => column.name === "story_title")) await db.prepare("ALTER TABLE photos ADD COLUMN story_title TEXT NOT NULL DEFAULT ''").run();
  if (!photoColumns.some((column) => column.name === "story_body")) await db.prepare("ALTER TABLE photos ADD COLUMN story_body TEXT NOT NULL DEFAULT ''").run();
  if (!photoColumns.some((column) => column.name === "story_alignment")) await db.prepare("ALTER TABLE photos ADD COLUMN story_alignment TEXT NOT NULL DEFAULT 'right'").run();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO journeys (id, slug, title, year, meta, intro) VALUES (?, ?, ?, ?, ?, ?)")
      .bind("journey-japan", "japan", japanJourney.title, 2026, japanJourney.meta, japanJourney.intro),
    db.prepare("UPDATE journeys SET year = 2026 WHERE slug = 'japan' AND year IS NULL"),
    db.prepare("INSERT OR IGNORE INTO about_content (id, intro_heading, intro_body, approach_heading, approach_body, gear, instagram_url) VALUES ('about', ?, ?, ?, ?, ?, ?)")
      .bind(defaultAboutContent.intro_heading, defaultAboutContent.intro_body, defaultAboutContent.approach_heading, defaultAboutContent.approach_body, defaultAboutContent.gear, defaultAboutContent.instagram_url),
    ...japanJourney.chapters.map((chapter, index) => db.prepare(
      "INSERT OR IGNORE INTO chapters (id, journey_id, slug, title, note, position) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(`chapter-japan-${chapter.id}`, "journey-japan", chapter.id, chapter.title, chapter.note ?? "", index)),
  ]);
}

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const db = getDb();
    await ensureContentSchema(db);
    return await db.prepare("SELECT intro_heading, intro_body, approach_heading, approach_body, gear, instagram_url FROM about_content WHERE id = 'about'").first<AboutContent>() ?? defaultAboutContent;
  } catch { return defaultAboutContent; }
}

export async function getRandomPublishedPhotos(limit = 2): Promise<Photo[]> {
  try {
    const db = getDb();
    await ensureContentSchema(db);
    const count = Math.max(1, Math.min(6, Math.floor(limit)));
    const records = (await db.prepare(`SELECT p.id, p.original_name, p.width, p.height, p.alt, p.caption
      FROM photos p JOIN journeys j ON j.id = p.journey_id
      WHERE j.status = 'published' ORDER BY RANDOM() LIMIT ?`).bind(count).all<{
        id: string; original_name: string; width: number; height: number; alt: string; caption: string;
      }>()).results;
    return records.map((photo) => ({
      src: `/media/${photo.id}`, alt: photo.alt || photo.caption || photo.original_name,
      width: photo.width, height: photo.height, caption: photo.caption || undefined,
    }));
  } catch { return []; }
}

export async function listAdminContent(): Promise<AdminJourney[]> {
  const db = getDb();
  await ensureContentSchema(db);
  const journeys = (await db.prepare("SELECT * FROM journeys ORDER BY COALESCE(year, 0) DESC, created_at DESC").all<Omit<AdminJourney, "chapters">>()).results;
  const chapters = (await db.prepare("SELECT * FROM chapters ORDER BY journey_id, position").all<Omit<AdminChapter, "photos">>()).results;
  const photos = (await db.prepare(
    "SELECT id, journey_id, chapter_id, original_name, mime_type, width, height, alt, caption, layout_type, layout_group, position, story_title, story_body, story_alignment FROM photos ORDER BY chapter_id, position",
  ).all<Omit<AdminPhoto, "src">>()).results;
  return journeys.map((journey) => ({ ...journey, chapters: chapters.filter((chapter) => chapter.journey_id === journey.id).map((chapter) => ({
    ...chapter,
    photos: photos.filter((photo) => photo.chapter_id === chapter.id).map((photo) => ({ ...photo, src: `/media/${photo.id}` })),
  })) }));
}

const toPhoto = (photo: AdminPhoto): Photo => ({
  src: photo.src, alt: photo.alt || photo.caption || photo.original_name,
  width: photo.width, height: photo.height, caption: photo.caption || undefined,
});

function blocksFromPhotos(photos: AdminPhoto[]): EditorialBlock[] {
  const groups = new Map<string, AdminPhoto[]>();
  for (const photo of photos) groups.set(photo.layout_group, [...(groups.get(photo.layout_group) ?? []), photo]);
  return [...groups.values()].sort((a, b) => a[0].position - b[0].position).flatMap((group): EditorialBlock[] => {
    const kind = group[0].layout_type;
    const values = group.map(toPhoto);
    if (kind === "pair" && values.length >= 2) return [{ type: "pair", photos: [values[0], values[1]] }];
    if (kind === "leadDetail" && values.length >= 2) return [{ type: "leadDetail", photos: [values[0], values[1]] }];
    if (kind === "sequence" && values.length >= 2) return [{ type: "sequence", photos: values.slice(0, 3) }];
    if (kind === "storyMoment" && group[0].story_body.trim()) return [{ type: "storyMoment", photo: values[0], title: group[0].story_title || undefined, body: group[0].story_body, alignment: group[0].story_alignment === "left" ? "left" : "right" }];
    if (kind === "fullBleed") return values.map((photo) => ({ type: "fullBleed", photo }));
    if (kind === "portraitFocus") return values.map((photo) => ({ type: "portraitFocus", photo }));
    return values.map((photo) => ({ type: "single", photo, align: "center" }));
  });
}

function journeyFromRecord(record: AdminJourney | undefined): Journey | null {
  if (!record) return null;
  const allPhotos = record.chapters.flatMap((chapter) => chapter.photos);
  if (!allPhotos.length) return null;
  const hero = allPhotos.find((photo) => photo.id === record.hero_photo_id) ?? allPhotos[0];
  return {
    slug: record.slug, title: record.title, meta: record.meta, intro: record.intro, hero: toPhoto(hero),
    chapters: record.chapters.filter((chapter) => chapter.photos.length).map((chapter) => ({
      id: chapter.slug, title: chapter.title, note: chapter.note, blocks: blocksFromPhotos(chapter.photos),
    })),
  };
}

export async function getPublishedJourney(slug: string): Promise<Journey | null> {
  try { return journeyFromRecord((await listAdminContent()).find((journey) => journey.slug === slug && journey.status === "published")); }
  catch { return null; }
}

export async function listPublishedJourneys(): Promise<Journey[]> {
  try {
    return (await listAdminContent())
      .filter((journey) => journey.status === "published")
      .map(journeyFromRecord)
      .filter((journey): journey is Journey => journey !== null);
  } catch { return []; }
}

export async function getAdminJourneyPreview(slug: string): Promise<Journey | null> {
  try { return journeyFromRecord((await listAdminContent()).find((journey) => journey.slug === slug)); }
  catch { return null; }
}
