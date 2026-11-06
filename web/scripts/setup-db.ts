// Creates Ayin's tables in the database at DATABASE_URL. Safe to run again: it only adds what's missing.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { close, exec } from "../src/lib/db";

async function main() {
  await exec(readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8"));
  console.log("The database is ready.");
}

main().finally(close);
