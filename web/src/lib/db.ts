import postgres from "postgres";
import { config } from "./config";

// Otto's data lives in Postgres (Supabase). The tables are in db/schema.sql.
// Queries are written with ? for each value, in order; they're numbered for Postgres here.

type Sql = ReturnType<typeof postgres>;

/** Counts and sums come back from Postgres as big integers; ours are small, so read them as numbers. */
const COUNT_TYPES = [20, 1700]; // bigint, numeric

function connect(): Sql {
  if (!config.databaseUrl) throw new Error("DATABASE_URL isn't set. See .env.example.");
  return postgres(config.databaseUrl, {
    // Supabase's pooler (transaction mode) doesn't keep prepared statements between queries,
    // and stalls when several queries are sent down one connection at once.
    prepare: false,
    max_pipeline: 1,
    types: { count: { to: 20, from: COUNT_TYPES, serialize: String, parse: Number } },
  });
}

// One connection pool, opened on first use and reused across hot reloads in development.
const globalForDb = globalThis as unknown as { ayinSql?: Sql };
function sql(): Sql {
  globalForDb.ayinSql ??= connect();
  return globalForDb.ayinSql;
}

/** Turn `?` placeholders into Postgres's `$1, $2, …`. */
function numbered(query: string): string {
  let n = 0;
  return query.replace(/\?/g, () => `$${++n}`);
}

type Value = string | number | boolean | null;

/** All rows a query returns. */
export async function all<T>(query: string, ...values: Value[]): Promise<T[]> {
  return (await sql().unsafe(numbered(query), values)) as unknown as T[];
}

/** The first row a query returns, or null. */
export async function one<T>(query: string, ...values: Value[]): Promise<T | null> {
  return (await all<T>(query, ...values))[0] ?? null;
}

/** Run an insert, update or delete. Returns how many rows it changed. */
export async function run(query: string, ...values: Value[]): Promise<number> {
  return (await sql().unsafe(numbered(query), values)).count;
}

/** Run SQL with no values, such as the schema file (several statements at once). */
export async function exec(text: string): Promise<void> {
  await sql().unsafe(text);
}

/** Close the connections, so a script can exit. */
export async function close(): Promise<void> {
  await globalForDb.ayinSql?.end();
  globalForDb.ayinSql = undefined;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
