import dotenv from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

// Load the root .env (Iteam/.env) regardless of where the CLI is invoked from.
// prisma.config.ts lives at server/, so root is two levels up.
dotenv.config({ path: resolve(__dirname, "../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
