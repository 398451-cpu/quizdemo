# Running on Replit

- Keep the existing Express server and static frontend structure.
- Install the dependencies declared in `package.json`.
- Use the **Start application** workflow (`npm start`).
- The server binds to `0.0.0.0` and defaults to port `5000`, matching the Replit preview. `PORT` can override this outside the default workflow.
- PostgreSQL is optional for startup. The imported code uses a mock database when no database is configured; a successful database health response does not guarantee a real PostgreSQL connection.
