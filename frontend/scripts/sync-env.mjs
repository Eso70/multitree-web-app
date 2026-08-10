/**
 * Generates `frontend/.env` from the repository-root `.env`.
 *
 * Next.js only reads environment files from its own package directory, so a
 * workspace that keeps one root `.env` needs a copy inside `frontend/`. The
 * copy is generated rather than maintained by hand so the root file stays the
 * single source of truth and the two can never drift.
 *
 * Only the keys the frontend actually reads are copied. Database, Redis, SMTP,
 * OAuth, and platform-administrator credentials stay in the backend's
 * environment: the frontend never reads them, so they must not be present in
 * its build context.
 *
 * Runs before `dev` and `build`. The generated file is ignored by git.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendDirectory = join(here, "..");
const rootEnvPath = join(frontendDirectory, "..", ".env");
const destination = join(frontendDirectory, ".env");

/**
 * Every variable the frontend reads, and nothing else.
 *
 * `PORT` is deliberately excluded: in the root file it is the backend's port
 * (4000), while the frontend listens on 3011. Leaving it out lets the frontend
 * fall back to its own default in development and use the value PM2 sets in
 * production.
 */
const FRONTEND_KEYS = [
  // Runtime mode.
  "NODE_ENV",
  // Public values inlined into the browser bundle.
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_APP_URL",
  // Server-only: the concealed platform-console route segment.
  "PLATFORM_ADMIN_PATH",
  // Server-only: authenticates frontend request telemetry to the backend.
  "REQUEST_TRACKING_SECRET",
  // Server-only: upload passthrough route.
  "UPLOAD_DIR",
  "MAX_FILE_SIZE_MB",
  // Server-only: response headers and dev-server origin allowlist.
  "CORS_ALLOWED_ORIGINS",
  "ALLOWED_DEV_ORIGINS",
];

/** Keys that must be present for the frontend to behave correctly. */
const REQUIRED_KEYS = [
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_APP_URL",
  "PLATFORM_ADMIN_PATH",
];

/**
 * Minimal dotenv reader. Handles `export` prefixes, `#` comments, and single or
 * double quoted values. Values are preserved verbatim so the generated file is
 * byte-comparable with the root entries it came from.
 */
const parseEnv = (contents) => {
  const values = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
};

/** Re-quotes a value only when it would otherwise not survive a round trip. */
const formatValue = (value) =>
  /^\s|\s$|#/.test(value) ? JSON.stringify(value) : value;

async function main() {
  if (!existsSync(rootEnvPath)) {
    throw new Error(
      `No .env found at ${rootEnvPath}. Copy .env.example to .env and fill it in.`,
    );
  }

  const rootValues = parseEnv(await readFile(rootEnvPath, "utf8"));

  const missingRequired = REQUIRED_KEYS.filter(
    (key) => !rootValues.get(key)?.length,
  );
  if (missingRequired.length > 0) {
    throw new Error(
      `The root .env is missing required frontend values: ${missingRequired.join(", ")}`,
    );
  }

  const lines = [
    "# Generated from the repository-root .env by frontend/scripts/sync-env.mjs.",
    "# Do not edit. Change the root .env and re-run `pnpm dev:fe` or `pnpm build:fe`.",
    "",
  ];

  const copied = [];
  for (const key of FRONTEND_KEYS) {
    const value = rootValues.get(key);
    if (value === undefined) continue;
    lines.push(`${key}=${formatValue(value)}`);
    copied.push(key);
  }

  await writeFile(destination, `${lines.join("\n")}\n`, "utf8");

  console.log(
    `frontend/.env generated from the root .env (${copied.length} of ${FRONTEND_KEYS.length} supported keys).`,
  );
}

main().catch((error) => {
  console.error("Failed to sync the frontend environment:", error.message);
  process.exit(1);
});
