/**
 * ENV BOOTSTRAP, must be the first import in any entry-point file.
 *
 * TypeScript compiles `import` statements to sequential `require()` calls, so
 * importing this module before all others guarantees dotenv.config() fires
 * before any singleton (e.g. `export const mesh = new NeuralMesh()`) reads
 * process.env at module-init time.
 *
 * override: true, forces .env values to win even when ANTHROPIC_API_KEY=""
 * is already present in the inherited environment (e.g. empty shell var).
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });
