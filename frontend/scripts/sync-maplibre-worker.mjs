/**
 * Copies MapLibre's worker into `public/` so it is served as a static file.
 *
 * The map uses MapLibre's CSP build, which loads its tile-decoding worker from
 * a URL rather than letting the bundler inline it — Next's bundler splits the
 * inlined worker into a chunk it then resolves against the page URL, which
 * returns HTML and silently leaves the map showing nothing but its background.
 *
 * Runs before dev and build so the served copy can never drift from the
 * installed version.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const destinationDirectory = join(here, "..", "public", "maplibre");
const destination = join(destinationDirectory, "maplibre-gl-csp-worker.js");

async function main() {
  await mkdir(destinationDirectory, { recursive: true });

  const packageJsonPath = require.resolve("maplibre-gl/package.json");
  await copyFile(
    join(dirname(packageJsonPath), "dist", "maplibre-gl-csp-worker.js"),
    destination,
  );

  // Arabic and Kurdish need shaping and bidi reordering that MapLibre does not
  // do on its own; without this plugin their labels render reversed. It is
  // loaded inside the tile worker, so it has to be served same-origin too.
  // The package's `exports` map exposes only its root, so neither the built
  // bundle nor its package.json can be resolved directly. The root resolves to
  // `src/index.js`, from which the package directory — and the prebuilt bundle
  // the worker actually needs — is one level up.
  const rtlEntry = require.resolve("@mapbox/mapbox-gl-rtl-text");
  const rtlSource = join(
    dirname(dirname(rtlEntry)),
    "dist",
    "mapbox-gl-rtl-text.js",
  );
  await copyFile(rtlSource, join(destinationDirectory, "mapbox-gl-rtl-text.js"));

  const { version } = JSON.parse(await readFile(packageJsonPath, "utf8"));
  console.log(
    `maplibre worker + RTL text plugin synced to public/maplibre (maplibre v${version})`,
  );
}

main().catch((error) => {
  console.error("Failed to sync the MapLibre worker:", error.message);
  process.exit(1);
});
