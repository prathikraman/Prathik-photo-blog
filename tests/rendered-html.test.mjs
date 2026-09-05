import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the public visual journal and private photo studio", async () => {
  await Promise.all([
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../dist/client/og.png", import.meta.url)),
    access(new URL("../dist/.openai/drizzle/0000_visual_journal_admin.sql", import.meta.url)),
    access(new URL("../dist/.openai/drizzle/0002_story_moments.sql", import.meta.url)),
    access(new URL("../dist/.openai/drizzle/0003_about_content.sql", import.meta.url)),
  ]);
  const [home, admin, journey] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/journeys/japan/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /Visual Journal/);
  assert.match(admin, /requireAdminUser/);
  assert.match(admin, /Photo Studio/);
  assert.match(journey, /getPublishedJourney/);
});

test("keeps stories inside journeys instead of a separate journal", async () => {
  const [home, header, editorial, composer] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Editorial.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/AdminStudio.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(home, /From the Journal|journal-section/);
  assert.doesNotMatch(header, /\/journal/);
  assert.match(editorial, /storyMoment/);
  assert.match(composer, /Story moment/);
  assert.match(composer, /Convert to Story moment/);
});

test("uses published travel photographs on the About page", async () => {
  const [about, content] = await Promise.all([
    readFile(new URL("../app/about/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/content-db.ts", import.meta.url), "utf8"),
  ]);
  assert.match(about, /getRandomPublishedPhotos/);
  assert.match(content, /WHERE j\.status = 'published' ORDER BY RANDOM\(\)/);
});

test("keeps upload persistence server-backed and owner protected", async () => {
  const [hosting, upload, auth, media, photoComponent] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/uploads/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/admin-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/media/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Photo.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "PHOTOS"/);
  assert.match(upload, /requireApiAdmin/);
  assert.match(upload, /createMultipartUpload/);
  assert.match(upload, /resumeMultipartUpload/);
  assert.match(auth, /prathik\.raman@gmail\.com/);
  assert.match(media, /Content-Disposition/);
  assert.match(media, /original_name/);
  assert.match(photoComponent, /photo-download/);
  assert.doesNotMatch(upload, /localStorage|sessionStorage/);
});
