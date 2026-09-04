import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { closeDb, sql } from "../lib/db";

async function main() {
  const directory = join(process.cwd(), "db");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await sql.query(await readFile(join(directory, file), "utf8"));
    console.log(`✓ ${file}`);
  }
  console.log("Migration terminée.");
}

main().then(closeDb).catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
