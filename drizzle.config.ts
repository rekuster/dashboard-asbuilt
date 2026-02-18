import { defineConfig } from "drizzle-kit";

const isPostgres = !!process.env.DATABASE_URL;

export default defineConfig({
    out: "./drizzle/migrations",
    schema: isPostgres ? "./drizzle/schema.pg.ts" : "./drizzle/schema.ts",
    dialect: isPostgres ? "postgresql" : "sqlite",
    dbCredentials: {
        url: isPostgres ? process.env.DATABASE_URL! : "sqlite.db",
    },
});
