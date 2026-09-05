import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceOrigin = (process.env.PHOTO_BLOG_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
const repositoryName = process.env.GITHUB_PAGES_REPOSITORY ?? "Prathik-photo-blog";
const basePath = `/${repositoryName}`;
const publicOrigin = `https://prathikraman.github.io${basePath}`;
const outputDirectory = path.resolve("pages-dist");

const contentTypeExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/avif", ".avif"],
  ["image/svg+xml", ".svg"],
]);

async function fetchChecked(route) {
  const response = await fetch(`${sourceOrigin}${route}`);
  if (!response.ok) {
    throw new Error(`Could not export ${route}: ${response.status} ${response.statusText}`);
  }
  return response;
}

function matches(html, expression) {
  return [...html.matchAll(expression)].map((match) => match[1]);
}

async function copyFonts(htmlPages) {
  const fontPaths = new Set();
  for (const html of htmlPages.values()) {
    for (const fontPath of matches(html, /([/][^"'() ]+[/]\.vinext[/]fonts[/][^"'() ]+\.woff2)/g)) {
      fontPaths.add(fontPath);
    }
  }

  const replacements = new Map();
  for (const fontPath of fontPaths) {
    const relativePath = fontPath.split("/.vinext/fonts/")[1];
    const destination = path.join(outputDirectory, "assets", "fonts", relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    try {
      await copyFile(fontPath, destination);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await copyFile(path.resolve(".vinext", "fonts", relativePath), destination);
    }
    replacements.set(fontPath, `${basePath}/assets/fonts/${relativePath}`);
  }
  return replacements;
}

async function downloadMedia(htmlPages) {
  const mediaRoutes = new Set();
  for (const html of htmlPages.values()) {
    for (const mediaRoute of matches(html, /(?:src|href)="(\/media\/[^"?]+)/g)) {
      mediaRoutes.add(mediaRoute);
    }
  }

  const replacements = new Map();
  for (const mediaRoute of mediaRoutes) {
    const response = await fetchChecked(mediaRoute);
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const extension = contentTypeExtensions.get(contentType) ?? "";
    const filename = `${path.basename(mediaRoute)}${extension}`;
    const destination = path.join(outputDirectory, "media", filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    replacements.set(mediaRoute, `${basePath}/media/${filename}`);
  }
  return replacements;
}

function staticHtml(html, fontReplacements, mediaReplacements) {
  let result = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, `<link rel="stylesheet" href="${basePath}/assets/site.css">`)
    .replaceAll(`${sourceOrigin}/og.png`, `${publicOrigin}/og.png`);

  for (const [source, destination] of fontReplacements) {
    result = result.replaceAll(source, destination);
  }
  for (const [source, destination] of mediaReplacements) {
    result = result.replaceAll(source, destination);
  }

  result = result.replace(/\b(href|src)="\/(?!\/|Prathik-photo-blog(?:\/|"))/g, `$1="${basePath}/`);
  return result;
}

async function main() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, "assets"), { recursive: true });

  const pages = new Map();
  for (const route of ["/", "/journeys", "/about"]) {
    pages.set(route, await (await fetchChecked(route)).text());
  }

  const journeyRoutes = new Set(
    matches(pages.get("/journeys"), /href="(\/journeys\/[^"?#]+)["?#]/g),
  );
  for (const route of journeyRoutes) {
    pages.set(route, await (await fetchChecked(route)).text());
  }

  const fontReplacements = await copyFonts(pages);
  const mediaReplacements = await downloadMedia(pages);

  for (const [route, html] of pages) {
    const directory = route === "/" ? outputDirectory : path.join(outputDirectory, route.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), staticHtml(html, fontReplacements, mediaReplacements));
  }

  const builtAssets = path.resolve("dist", "client", "assets");
  const cssFilename = (await readdir(builtAssets)).find((filename) => filename.endsWith(".css"));
  if (!cssFilename) throw new Error("No compiled stylesheet found. Run npm run build first.");
  await copyFile(path.join(builtAssets, cssFilename), path.join(outputDirectory, "assets", "site.css"));
  await copyFile(path.resolve("public/favicon.svg"), path.join(outputDirectory, "favicon.svg"));
  await copyFile(path.resolve("public/og.png"), path.join(outputDirectory, "og.png"));
  await writeFile(path.join(outputDirectory, ".nojekyll"), "");

  console.log(`Exported ${pages.size} public pages, ${mediaReplacements.size} photos, and ${fontReplacements.size} fonts to pages-dist.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
