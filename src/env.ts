import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

/**
 * Load environment variables from .env files.
 *
 * Search order (first match wins, later files do NOT override earlier ones,
 * and pre-existing process.env variables ALWAYS win):
 *   1. cwd/.env.local
 *   2. cwd/.env
 *   3. <package root>/.env       (so a globally-linked `soltools` still
 *                                  picks up a project-local .env when
 *                                  invoked from elsewhere is opt-in)
 */
export function loadEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false });
    }
  }
}
