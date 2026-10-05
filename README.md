# Express + PostgreSQL starter

Plain HTML, CSS, and browser JavaScript served by Node.js 24 and Express 5. PostgreSQL access uses the `pg` package.

## Run

```sh
npm install
npm run dev
```

The server listens on port `5000` by default. `npm start` runs it without file watching.

## Replit PostgreSQL

Use the Replit-managed PostgreSQL database. Its `DATABASE_URL` environment variable is read by the server; do not commit a connection string. The server still starts if the variable is missing, while database endpoints respond with a clear unavailable status.

## Endpoints

- `GET /api/health` — confirms that the Express server is responding.
- `GET /api/db/health` — checks PostgreSQL with a parameterized query.
- `POST /api/db/echo` — accepts `{"message":"hello"}` and passes the value to PostgreSQL separately from the SQL text. This example does not persist data.

Static client files live in `public/`. Database calls are made only by the server, never from browser JavaScript.
