# First Cloudflare deployment

About-image migration update: include `--table about_images` in BOTH SQL export commands below (five application tables total). Open the local app once before stopping it for export so its additive schema initialization creates this table. The photo-transfer helper now includes both journey and About originals. Compare the destination `about_images` count and rows as well. The new migration `0004_about_images.sql` is applied by the existing production migration command.

This application currently runs locally only. Nothing in this preparation creates resources or deploys. Use the installed Node >=22.13.0, Vinext 0.0.50, Cloudflare Vite plugin 1.37.1 and Wrangler 4.92.0. Commands below are future manual actions, run from the project root. `npx --no-install` uses the installed CLI, not a new dependency.

## Important limitation: public-only first deployment

A standalone Worker does not provide the hosting-injected ChatGPT identity used by this app. Production configuration therefore sets `DEPLOYMENT_MODE=public-only`. Protected pages return 404 and admin APIs return 401, even if a caller supplies an owner identity header. Draft media remains inaccessible. No new authentication is implemented.

This can host imported **published** content safely, but it is NOT yet a production authoring environment. Upload, private preview and publishing are blocked until a separately approved authentication implementation. Do not remove this guard or expose the dev server to work around it. The production validator intentionally refuses another mode.

## Configuration ownership and local preservation

- Source: `wrangler.production.json` owns future real Worker/account/D1/R2 settings. Every `REPLACE_WITH_...` value must be replaced. It contains no credentials. `assets.binding=ASSETS` allows Vite to package generated client assets.
- `vite.config.ts` selects that file only for `PHOTO_BLOG_DEPLOYMENT=production` builds. Normal `npm run dev` and `npm run build` retain the original local bindings and `.wrangler/state` persistence. Do not rename the local database ID or bucket.
- `wrangler.local-data.json` is ONLY for local export commands. Its existing all-zero-style database ID intentionally matches the current simulation. Never use it with `--remote` or deploy it.
- `.openai/hosting.json` and `build/sites-vite-plugin.ts` remain unchanged for legacy managed-host packaging. They do not identify real standalone resources.
- `dist/server/wrangler.json`, `dist/server/index.js`, `dist/client`, `dist/.openai`, and `.wrangler/deploy/config.json` are generated. Do not edit them as deployment source. The deploy script always builds fresh and checks generated bindings before deploying.
- Production builds reuse `dist`; run a normal `npm run build` before using local `npm start` afterward. Local database/photo state is not changed by builds. Production configuration cannot be selected for Vite dev.
- GitHub Pages exporter/workflow remain unused and unchanged.

## First deployment commands — do not run until ready

Choose names yourself; uppercase tokens below are placeholders, not proposed real resources.

```sh
npx --no-install wrangler login
npx --no-install wrangler whoami
npx --no-install wrangler d1 create YOUR_DATABASE_NAME
npx --no-install wrangler r2 bucket create YOUR_PRIVATE_BUCKET_NAME
```

In `wrangler.production.json`, enter the account ID, chosen Worker name, returned database name/UUID, and actual bucket name. Use the same account for both resources. Account/database identifiers are not secrets; do not store API tokens in this file. Leave bucket public access and r2.dev disabled; do not attach a public bucket domain. Photos are served through `/media/:id`.

```sh
npm run production:check
npm run production:migrate
```

`production:check` is offline and rejects placeholders, local bindings, missing assets binding, and enabling admin. It does not prove resources exist. `production:migrate` explicitly runs `wrangler d1 migrations apply DB --remote --config wrangler.production.json` against `drizzle/`.

If migrating local content, complete the next section **before first deploy**. Do not let application request-time seeding populate the destination first.

```sh
npm run production:deploy
```

This validates source values, builds with `NODE_ENV=production`, validates the generated configuration, then runs `wrangler deploy --config dist/server/wrangler.json`. It does not run migrations. `npm run production:build` performs only the guarded build; it is optional because deploy builds again. Do not bypass the wrapper with a direct deploy of source TypeScript or a stale local `dist` configuration.

Use the actual HTTPS `workers.dev` URL reported by Wrangler. It depends on your Worker name/account subdomain; no live URL exists in this preparation.

## Local-to-production content migration

Read-only inspection found 3 journeys, 9 chapters, 70 photos, and 1 About record. R2 metadata contains 70 objects totaling 519,091,164 bytes; all 70 D1 object keys match local R2 metadata. Counts can change; verify again at migration time. This is not a full byte-integrity check.

Local data is in `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` and `.wrangler/state/v3/r2/`. R2 uses internal metadata plus blob/part storage. **Do not upload internal blob filenames**: multipart objects may span parts. Retrieve completed objects through Wrangler's local R2 API with their original object keys.

### 1. Freeze and back up

Stop the local development server and finish/cancel uploads first. Keep it stopped during the complete export. Copy the entire `.wrangler/state` folder to a dated backup outside the repository, retaining SQLite sidecars. Do not delete, reset, or repoint local state. Create a fresh private backup directory for the following artifacts; do not commit originals or SQL exports.

### 2. Export SQL and originals

Replace `BACKUP_DIRECTORY` with that existing absolute path:

```sh
npx --no-install wrangler d1 export DB --local --config wrangler.local-data.json --output BACKUP_DIRECTORY/full-local.sql --table journeys --table chapters --table photos --table about_content
npx --no-install wrangler d1 export DB --local --config wrangler.local-data.json --no-schema --output BACKUP_DIRECTORY/content.sql --table journeys --table chapters --table photos --table about_content
node scripts/transfer-photos.mjs download-local BACKUP_DIRECTORY
```

The helper queries local D1, retrieves all photo keys (including draft photographs) from local R2, saves originals using photo IDs, and writes `photos-manifest.json` with SHA-256 hashes. It stops on any missing object. This avoids manually re-uploading photos through admin. It never runs automatically.

Inspect `content.sql` before import: only the four application tables should be included, with parent records before child records. Wrangler exports insert data; preserve those inserts and IDs unchanged. Do not import the full schema after applying migrations: the local schema already includes the year/story columns, so reapplying their ALTER migrations would conflict.

### 3. Import into NEW, unused remote resources only

Apply `production:migrate` first. It creates the schema and seeds one default About row. Confirm journeys/chapters/photos are empty and no application has served the destination yet:

```sh
npx --no-install wrangler d1 execute DB --remote --config wrangler.production.json --command "SELECT 'journeys' AS entity, COUNT(*) AS count FROM journeys UNION ALL SELECT 'chapters', COUNT(*) FROM chapters UNION ALL SELECT 'photos', COUNT(*) FROM photos;"
```

Stop if any count is nonzero. Confirm the destination bucket is newly created and empty in Cloudflare. The upload command overwrites identical keys; do not use it against an existing content bucket.

```sh
node scripts/transfer-photos.mjs upload-remote BACKUP_DIRECTORY
node scripts/transfer-photos.mjs verify-remote BACKUP_DIRECTORY
```

The helper preserves exact object keys and content types; remote verification downloads each object and compares SHA-256. Original names remain in D1, which the download route uses. R2 custom metadata such as originalName is not copied by this CLI helper; it is not used by the app's delivery path. Originals themselves remain byte-for-byte unchanged.

Only for the confirmed **new unused** database, remove the migration's default About row before importing its real local counterpart:

```sh
npx --no-install wrangler d1 execute DB --remote --config wrangler.production.json --command "DELETE FROM about_content WHERE id = 'about';"
npx --no-install wrangler d1 execute DB --remote --config wrangler.production.json --file BACKUP_DIRECTORY/content.sql
npx --no-install wrangler d1 execute DB --remote --config wrangler.production.json --command "PRAGMA foreign_key_check; SELECT 'journeys' AS entity, COUNT(*) AS count FROM journeys UNION ALL SELECT 'chapters', COUNT(*) FROM chapters UNION ALL SELECT 'photos', COUNT(*) FROM photos UNION ALL SELECT 'about', COUNT(*) FROM about_content;"
```

Compare IDs/slugs, ordering, cover references, status and About fields against the export—not only counts. This data-only import preserves record IDs, chapter/photo positions, layout groups/stories, hero IDs, object keys, timestamps, and draft/published state. Do not import Miniflare internal tables or replace remote migration history. If import partially fails, stop; do not blindly rerun inserts. Prefer another new empty destination and repeat migration rather than deleting local data or changing the export.

## Verification after eventual deployment

- Signed out: `/`, `/journeys`, a known published journey, `/about`, CSS/fonts/JS, favicon and `/og.png`.
- Check the social-image origin is the actual HTTPS hostname, not localhost.
- A representative published `/media/:id` and its download work; draft media returns 404.
- `/admin` and `/admin/preview/:slug` return 404 in this public-only phase. Anonymous admin APIs return 401. Supplying identity headers must not bypass this guard.
- **Blocked pending future authentication:** owner login, upload, private preview and publish in production. Do not claim those flows are verified or the production CMS is complete.
- Normal local admin upload/preview/publish remains available through `npm run dev`; local edits do not automatically synchronize to production. Do not rerun the first-import recipe against a live populated database.

## Rollback

Before first deployment, keep local state, SQL exports and original backups unchanged. If validation/import fails, do not publish; fix the new remote destination separately. If the first public release is bad, disable its public route/workers.dev exposure in Cloudflare; there is no prior public revision to roll back to. Do not delete DB/R2 as a rollback step. A later code rollback does not reverse database changes; retain backups and use additive migrations. Restore local build output with normal `npm run build` if necessary, never by resetting `.wrangler/state`.
