import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env by itself. In CI or on the host, the variables come from the environment.
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations use Neon's direct connection; the app uses the pooled one (src/lib/db.ts).
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
