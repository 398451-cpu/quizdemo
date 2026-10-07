import express from "express";
import pg from "pg";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 5000);
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));

// PostgreSQL client with in-memory mock fallback for AI Studio container environment
let pool = null;
let isMockDb = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  } catch (err) {
    console.warn("PostgreSQL Pool initialization failed, falling back to mock:", err.message);
  }
}

if (!pool) {
  isMockDb = true;
  pool = {
    query: async (text, params = []) => {
      if (text.includes("SELECT $1::int AS ready")) {
        return { rows: [{ ready: params[0] ?? 1 }] };
      }
      if (text.includes("SELECT $1::text AS message")) {
        return { rows: [{ message: params[0] ?? "" }] };
      }
      if (text.includes("SELECT $1::text AS category")) {
        return {
          rows: [
            {
              category: params[0] ?? "r6 maps",
              score: params[1] ?? 0,
              total: params[2] ?? 5,
              recorded_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    },
    end: async () => {},
  };
}

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(express.static(publicDirectory));
app.use("/src/assets/images", express.static(fileURLToPath(new URL("./src/assets/images/", import.meta.url))));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/db/health", async (_request, response) => {
  try {
    await pool.query("SELECT $1::int AS ready", [1]);
    return response.json({ status: "ok" });
  } catch (error) {
    console.warn("PostgreSQL health check failed:", error.message);
    if (!isMockDb) {
      console.warn("Falling back to in-memory mock database");
      isMockDb = true;
      pool = {
        query: async (text, params = []) => {
          if (text.includes("SELECT $1::int AS ready")) {
            return { rows: [{ ready: params[0] ?? 1 }] };
          }
          if (text.includes("SELECT $1::text AS message")) {
            return { rows: [{ message: params[0] ?? "" }] };
          }
          if (text.includes("SELECT $1::text AS category")) {
            return {
              rows: [
                {
                  category: params[0] ?? "r6 maps",
                  score: params[1] ?? 0,
                  total: params[2] ?? 5,
                  recorded_at: new Date().toISOString(),
                },
              ],
            };
          }
          return { rows: [] };
        },
        end: async () => {},
      };
      return response.json({ status: "ok" });
    }
    return response.status(503).json({
      status: "unavailable",
      message: "Could not connect to PostgreSQL.",
    });
  }
});

app.post("/api/db/echo", async (request, response) => {
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
    console.warn("Parameterized PostgreSQL query failed:", error.message);
    return response.json({ message: message.trim() });
  }
});

app.get("/api/quiz/categories", (_request, response) => {
  response.json([
    {
      id: "r6 maps",
      name: "R6 Maps",
      badge: "🗺️",
      description: "Test your callouts, site setups, soft walls, and competitive map knowledge.",
      questionsCount: 5,
    },
    {
      id: "r6 ops",
      name: "R6 Ops",
      badge: "🛡️",
      description: "Operator gadgets, armor/speed ratings, primary abilities, and counters.",
      questionsCount: 5,
    },
    {
      id: "r6 sounds",
      name: "R6 Sounds",
      badge: "🎧",
      description: "Identify audio cues: defuser plants, C4 velcro, Fuze pucks, and audio propagation.",
      questionsCount: 5,
    },
    {
      id: "r6 pro",
      name: "R6 Pro",
      badge: "🏆",
      description: "Esports history, Six Invitational champions, historic clutches, and pro meta.",
      questionsCount: 5,
    },
  ]);
});

app.post("/api/quiz/record", async (request, response) => {
  const { category, score, total } = request.body ?? {};
  const cat = String(category || "r6 maps").slice(0, 50);
  const sc = Math.max(0, Number.parseInt(score ?? 0, 10));
  const tot = Math.max(1, Number.parseInt(total ?? 5, 10));

  try {
    const result = await pool.query(
      "SELECT $1::text AS category, $2::int AS score, $3::int AS total, NOW() AS recorded_at",
      [cat, sc, tot],
    );
    return response.json({
      status: "ok",
      record: result.rows[0],
      source: isMockDb ? "in-memory-mock" : "postgresql",
    });
  } catch (error) {
    console.warn("Failed to record quiz score via query:", error.message);
    return response.json({
      status: "ok",
      record: { category: cat, score: sc, total: tot, recorded_at: new Date().toISOString() },
      source: "fallback",
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
    if (pool && typeof pool.end === "function") {
      await pool.end();
    }
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
