import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { gzipSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const NEXT_BUILD_MANIFEST = join(root, ".next", "build-manifest.json");
const STATIC_CHUNKS_DIR = join(root, ".next", "static", "chunks");

const CRITICAL_ROUTES = ["/dashboard", "/dashboard/page"];
const CRITICAL_BUNDLE_LIMIT = 150 * 1024; // 150KB gzipped

function getGzipSize(filePath) {
  if (!existsSync(filePath)) return 0;
  return gzipSync(readFileSync(filePath)).length;
}

function checkBundleSizes() {
  console.log("Checking bundle sizes...\n");

  if (!existsSync(NEXT_BUILD_MANIFEST)) {
    console.log("Build manifest not found. Skipping bundle size check.");
    return;
  }

  const manifest = JSON.parse(readFileSync(NEXT_BUILD_MANIFEST, "utf-8"));
  const pageChunks = manifest.pages ?? {};
  const files = existsSync(STATIC_CHUNKS_DIR) ? readdirSync(STATIC_CHUNKS_DIR) : [];

  let totalCriticalSize = 0;

  for (const route of CRITICAL_ROUTES) {
    const routeChunks = pageChunks[route] ?? [];
    for (const chunkId of routeChunks) {
      const id = typeof chunkId === "string" ? chunkId : String(chunkId);
      const chunkFile = files.find(
        (f) => f === id || f.startsWith(id) || f.includes(id.replace(/^[a-z]+\//, ""))
      );
      if (chunkFile) {
        const size = getGzipSize(join(STATIC_CHUNKS_DIR, chunkFile));
        totalCriticalSize += size;
        console.log(`  ${route} -> ${chunkFile}: ${(size / 1024).toFixed(1)}KB`);
      }
    }
  }

  const criticalKB = (totalCriticalSize / 1024).toFixed(1);
  const limitKB = (CRITICAL_BUNDLE_LIMIT / 1024).toFixed(1);

  console.log(`\nCritical bundle total: ${criticalKB}KB gzipped (limit: ${limitKB}KB)`);

  if (totalCriticalSize > CRITICAL_BUNDLE_LIMIT) {
    console.error(
      `\n\u274c FAIL: Critical bundle size ${criticalKB}KB exceeds limit of ${limitKB}KB`
    );
    process.exit(1);
  }

  console.log(`\n\u2705 PASS: Critical bundle size is within limits`);
}

checkBundleSizes();
