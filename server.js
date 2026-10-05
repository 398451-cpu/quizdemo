import express from "express";
import pg from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { Pool } = pg;
const app = express();
const port = Number.parseInt(process.env.PORT ?? "5000", 10);
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(express.static(publicDirectory));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/db/health", async (_request, response) => {
  if (!pool) {
    return response.status(503).json({
      status: "unavailable",
      message: "DATABASE_URL is not configured.",
    });
  }

  try {
    await pool.query("SELECT $1::int AS ready", [1]);
    return response.json({ status: "ok" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    return response.status(503).json({
      status: "unavailable",
      message: "Could not connect to PostgreSQL.",
    });
  }
});

app.post("/api/db/echo", async (request, response) => {
  if (!pool) {
    return response.status(503).json({
      message: "DATABASE_URL is not configured.",
    });
  }

  const { message } = request.body ?? {};
  if (typeof message !== "string" || message.trim().length === 0) {
    return response.status(400).json({
      message: "Provide a non-empty message string.",
    });
  }

  try {
    // Keep user-provided values separate from SQL to prevent SQL injection.
    const result = await pool.query(
      "SELECT $1::text AS message",
      [message.trim()],
    );
    return response.json({ message: result.rows[0].message });
  } catch (error) {
    console.error("Parameterized PostgreSQL query failed:", error.message);
    return response.status(503).json({
      message: "The PostgreSQL query could not be completed.",
    });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ message: "Request body must be valid JSON." });
  }
  console.error("Request error:", error);
  return response.status(500).json({ message: "Internal server error." });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});

async function shutDown() {
  server.close(async () => {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
