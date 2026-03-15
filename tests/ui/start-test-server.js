// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)

/**
 * Playwright UI-test startup script.
 *
 * 1. Starts an isolated in-memory MongoDB instance (MongoMemoryServer).
 * 2. Exports its URI as MONGO_URL in the environment.
 * 3. Spawns `npm run dev` (backend + React client) with that overridden
 *    MONGO_URL so the real database is never touched during UI tests.
 *
 * Used by playwright.config.ts webServer.
 */
import { spawn } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri();
console.log(`[test-server] In-memory MongoDB ready: ${uri}`);

// Both ports are picked dynamically by playwright.config.ts so that a dev
// who already has `npm run dev` running (backend on 6060, client on 3000)
// never causes a port collision with the UI test run.
const clientPort  = process.env.CLIENT_PORT  ?? "3000";
const backendPort = process.env.BACKEND_PORT ?? "6060";
console.log(`[test-server] Backend on :${backendPort}, React client on :${clientPort}`);

// Write connection details to a temp file so that Playwright test fixtures
// can connect to the same in-memory MongoDB to seed/clear data between tests.
mkdirSync(".tmp", { recursive: true });
writeFileSync(
  ".tmp/test-env.json",
  JSON.stringify({ mongoUri: uri, backendPort }),
  "utf-8"
);

const backend = spawn("node", ["server.js"], {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, MONGO_URL: uri, PORT: backendPort },
});

// Start React client separately — react-scripts reads PORT; the proxy target
// is set via BACKEND_PORT which setupProxy.js picks up at runtime.
// CI=true makes react-scripts fail fast if the port is taken.
const client = spawn("npm", ["run", "client"], {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, PORT: clientPort, BACKEND_PORT: backendPort, CI: "true" },
});

backend.on("error", (err) => {
  console.error("[test-server] Backend failed to start:", err);
  process.exit(1);
});

client.on("error", (err) => {
  console.error("[test-server] Client failed to start:", err);
  process.exit(1);
});

// Graceful shutdown: stop both processes then MongoDB
const shutdown = async () => {
  backend.kill();
  client.kill();
  await mongod.stop();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});
