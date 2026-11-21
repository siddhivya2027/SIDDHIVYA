// Runs before `next build` on Vercel: brings the database tables up to date with prisma/schema.prisma.
// Skipped when no database is connected yet (the site still builds in demo mode).
// If a change would delete data, Prisma stops and the build fails — nothing is ever dropped silently.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[prepare-db] DATABASE_URL not set — skipping database update (demo mode build).");
  process.exit(0);
}
const env = { ...process.env, DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL };
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });
