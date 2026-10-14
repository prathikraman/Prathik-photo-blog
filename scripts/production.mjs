import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readProductionConfig, validateProductionConfig } from "./production-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const action = process.argv[2];
if (!["check", "build", "migrate", "deploy"].includes(action) || process.argv.length !== 3) {
  throw new Error("Use production.mjs check|build|migrate|deploy (no extra arguments).");
}
const config = readProductionConfig();
const run = (bin, args, production = false) => {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: root, stdio: "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: ".wrangler/logs", ...(production ? { PHOTO_BLOG_DEPLOYMENT: "production", NODE_ENV: "production" } : {}) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const wrangler = "node_modules/wrangler/bin/wrangler.js";
if (action === "check") console.log("Production values validated locally; remote resources and authentication have NOT been verified.");
if (action === "migrate") run(wrangler, ["d1", "migrations", "apply", "DB", "--remote", "--config", "wrangler.production.json"]);
if (action === "build" || action === "deploy") {
  const pkg = JSON.parse(readFileSync("node_modules/vinext/package.json", "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.vinext;
  run(`node_modules/vinext/${bin}`, ["build"], true);
  const generated = validateProductionConfig(JSON.parse(readFileSync("dist/server/wrangler.json", "utf8")));
  if (generated.d1_databases[0].database_id !== config.d1_databases[0].database_id || generated.r2_buckets[0].bucket_name !== config.r2_buckets[0].bucket_name || generated.name !== config.name || generated.account_id !== config.account_id || !generated.assets.directory) {
    throw new Error("Generated deployment does not match production source configuration or has no assets directory.");
  }
  if (action === "deploy") run(wrangler, ["deploy", "--config", "dist/server/wrangler.json"]);
}
