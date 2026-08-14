import { execFileSync } from "child_process";

/**
 * Tests talk to a real database through Prisma. Point them at a throwaway
 * SQLite file rather than prisma/dev.db: the suite creates and deletes rows,
 * so sharing the development database both corrupts real data and makes the
 * assertions depend on whatever happens to be in it.
 *
 * Must match `test.env.DATABASE_URL` in vitest.config.ts. The path is relative
 * to prisma/schema.prisma, which is how Prisma resolves sqlite URLs.
 */
const TEST_DATABASE_URL = "file:./test.db";

export default function setup() {
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--force-reset", "--skip-generate", "--accept-data-loss"],
    {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    }
  );
}
