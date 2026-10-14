import { readFileSync } from "node:fs";

export function validateProductionConfig(config) {
  const fail = (message) => { throw new Error(`Production configuration: ${message}`); };
  if (/REPLACE_WITH_|00000000-0000-4000-8000-000000000000|site-creator-(d1|r2)/.test(JSON.stringify(config))) {
    fail("replace every placeholder with real production values; local resources are forbidden.");
  }
  if (!/^[a-f0-9]{32}$/i.test(config.account_id ?? "")) fail("account_id must be a Cloudflare account ID.");
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(config.name ?? "")) fail("choose a valid Worker name.");
  const db = config.d1_databases?.[0];
  if (config.d1_databases?.length !== 1 || db?.binding !== "DB" || !db.database_name || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(db.database_id ?? "")) fail("configure exactly one real D1 database bound as DB.");
  const bucket = config.r2_buckets?.[0];
  if (config.r2_buckets?.length !== 1 || bucket?.binding !== "PHOTOS" || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket.bucket_name ?? "")) fail("configure a real bucket bound as PHOTOS.");
  if (config.vars?.DEPLOYMENT_MODE !== "public-only") fail("admin must remain disabled until production authentication is implemented.");
  if (config.assets?.binding !== "ASSETS") fail("ASSETS binding is required.");
  return config;
}

export function readProductionConfig() {
  return validateProductionConfig(JSON.parse(readFileSync(new URL("../wrangler.production.json", import.meta.url), "utf8")));
}
