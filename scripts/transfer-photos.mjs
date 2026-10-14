// Explicitly invoked migration utility. Never runs as part of build/deploy.
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readProductionConfig } from "./production-config.mjs";

const [action, directory] = process.argv.slice(2);
if (!["download-local", "upload-remote", "verify-remote"].includes(action) || !directory || process.argv.length !== 4) {
  throw new Error("Usage (project root): node scripts/transfer-photos.mjs download-local|upload-remote|verify-remote BACKUP_DIRECTORY");
}
const folder = resolve(directory);
const manifestPath = resolve(folder, "photos-manifest.json");
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
function wrangler(args, capture = false) {
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
    encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Wrangler failed; stop and inspect before retrying.");
  return result.stdout;
}
if (action === "download-local") {
  if (existsSync(manifestPath)) throw new Error("Use a fresh backup directory; an existing manifest will not be overwritten.");
  mkdirSync(resolve(folder, "photos"), { recursive: true });
  const result = JSON.parse(wrangler(["d1", "execute", "DB", "--local", "--config", "wrangler.local-data.json", "--json", "--command", "SELECT id, object_key, mime_type, original_name FROM photos UNION ALL SELECT id, object_key, mime_type, slot AS original_name FROM about_images ORDER BY id"], true));
  const rows = result.flatMap((entry) => entry.results ?? []);
  if (!rows.length) throw new Error("No local photos found. Confirm persistence path; do not continue with an empty migration.");
  for (const row of rows) {
    if (!/^[a-zA-Z0-9-]+$/.test(row.id) || !/^(journeys|about)\//.test(row.object_key)) throw new Error("Unexpected photo identifier/key.");
    const file = resolve(folder, "photos", `${row.id}.bin`);
    if (existsSync(file)) throw new Error("Partial prior download exists; use a fresh directory.");
    wrangler(["r2", "object", "get", `site-creator-r2/${row.object_key}`, "--local", "--persist-to", ".wrangler/state", "--config", "wrangler.local-data.json", "--file", file]);
    row.sha256 = hash(file);
  }
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2), { flag: "wx" });
  console.log(`Saved ${rows.length} originals and checksums. No remote calls made.`);
} else {
  const config = readProductionConfig();
  const bucket = config.r2_buckets[0].bucket_name;
  const rows = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const row of rows) {
    if (!/^[a-zA-Z0-9-]+$/.test(row.id) || !/^(journeys|about)\//.test(row.object_key)) throw new Error("Unexpected manifest entry.");
    const file = resolve(folder, "photos", `${row.id}.bin`);
    if (hash(file) !== row.sha256) throw new Error(`Local checksum mismatch: ${row.id}`);
    const args = ["--remote", "--config", "wrangler.production.json"];
    if (action === "upload-remote") {
      // Target must be the newly created empty migration bucket; put overwrites keys.
      wrangler(["r2", "object", "put", `${bucket}/${row.object_key}`, ...args, "--file", file, "--content-type", row.mime_type]);
    } else {
      const check = resolve(folder, `${row.id}.remote-check`);
      if (existsSync(check)) throw new Error("Prior verification file exists; inspect it before retrying.");
      wrangler(["r2", "object", "get", `${bucket}/${row.object_key}`, ...args, "--file", check]);
      if (hash(check) !== row.sha256) throw new Error(`Remote checksum mismatch: ${row.id}; retained verification file.`);
      unlinkSync(check);
    }
  }
  console.log(`${action}: ${rows.length} objects processed.`);
}
