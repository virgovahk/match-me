import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const migrationsDir = path.join(__dirname, "../migration");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql"));

  files.sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Running ${file}...`);
    await pool.query(sql);
  }

  console.log("All migrations applied!");
  await pool.end();
}

runMigration().catch(err => console.error(err));
