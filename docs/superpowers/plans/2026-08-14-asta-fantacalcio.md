# Asta Fantacalcio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js web app to run a fantasy football (fantacalcio) auction: player catalog, league teams, player-to-team assignment with credit tracking, search/filters, roster summaries, and a personal watchlist.

**Architecture:** Single Next.js (App Router) app, no separate backend. SQLite via Prisma for persistence. Server Components fetch and render data-heavy pages; Client Components handle interactive bits (filters, forms, assign modal) via `fetch` calls to Next.js Route Handlers, followed by `router.refresh()` to re-render server data.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Prisma 5 + SQLite, Tailwind CSS, `xlsx` (SheetJS) for CSV/Excel parsing (used both client-side, for header preview, and server-side, for import).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-14-asta-fantacalcio-design.md`
- Single-user, local-only tool. No authentication, no multi-device access.
- No automated test suite (explicit spec decision) — every task ends with a **manual verification** step (dev server + browser/curl), not an automated test.
- Database: SQLite file at `prisma/dev.db`, `DATABASE_URL="file:./dev.db"` in `.env` (gitignored; `.env.example` committed).
- Code uses **English, camelCase field names** (`name`, `role`, `serieATeam`, `fantasyTeamId`, `cost`, `starter`, `watchlist` / `name`, `coach`, `totalCredits`). UI copy is in **Italian**.
- Role enum (Classic system): `GK`, `DEF`, `MID`, `FWD`.
- "Svincolato" (free agent) is **derived** from `fantasyTeamId === null` — no stored boolean column for it.
- `remainingCredits` is **always computed** (`totalCredits - SUM(cost of assigned players)`), never stored as a column.
- `cost` is nullable on Player, set only when a player is assigned to a team. No separate "quotazione base" field.
- Deleting a team with assigned players is blocked (HTTP 409) — players must be unassigned first.
- Assigning a player for more than a team's remaining credits shows a warning but is **not blocked** server-side.
- Player deletion is out of scope (spec never requested it) — do not add a DELETE endpoint or UI for players.
- Import column mapping (which file column maps to `name`/`role`/`serieATeam`) is done interactively in the UI, since the exact source file layout is not yet known — the user will supply a sample file later to validate/adjust this against real data.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

**Interfaces:**
- Produces: a running Next.js dev server at `http://localhost:3000` rendering a placeholder heading. Later tasks add real routes under `app/`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ao-fanta",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^5.20.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "prisma": "^5.20.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
prisma/dev.db
prisma/dev.db-journal
.env
```

- [ ] **Step 7: Create `.env.example`**

```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 8: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Create `app/layout.tsx`**

```tsx
import "./globals.css";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Create `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Fantacalcio Auction Manager</h1>
    </main>
  );
}
```

- [ ] **Step 11: Install dependencies and verify the dev server**

```bash
npm install
cp .env.example .env
npm run dev &
sleep 3
curl -s http://localhost:3000 | grep -q "Fantacalcio Auction Manager" && echo "OK: home page renders"
kill %1
```

Expected: `OK: home page renders` printed.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs .gitignore .env.example app/globals.css app/layout.tsx app/page.tsx
git commit -m "chore: scaffold Next.js + Tailwind project"
```

---

### Task 2: Prisma schema and client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

**Interfaces:**
- Consumes: `.env` with `DATABASE_URL` (Task 1)
- Produces: `prisma` singleton client (`import { prisma } from "@/lib/prisma"`), Prisma models `Team` and `Player` with enum `Role` (`GK`, `DEF`, `MID`, `FWD`). Field names on `Player`: `id, name, role, serieATeam, fantasyTeamId, fantasyTeam, cost, starter, watchlist`. Field names on `Team`: `id, name, coach, totalCredits, players`.

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  GK
  DEF
  MID
  FWD
}

model Team {
  id           String   @id @default(uuid())
  name         String
  coach        String
  totalCredits Int
  players      Player[]
  createdAt    DateTime @default(now())
}

model Player {
  id            String   @id @default(uuid())
  name          String
  role          Role
  serieATeam    String
  fantasyTeamId String?
  fantasyTeam   Team?    @relation(fields: [fantasyTeamId], references: [id])
  cost          Int?
  starter       Boolean  @default(false)
  watchlist     Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([fantasyTeamId])
  @@index([role])
}
```

- [ ] **Step 2: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/migrations/<timestamp>_init/`, `prisma/dev.db`, and generates the Prisma client.

- [ ] **Step 3: Verify the tables exist**

```bash
sqlite3 prisma/dev.db ".tables"
```

Expected: output includes `Team` and `Player`.

- [ ] **Step 4: Create `lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Commit**

```bash
git add prisma lib/prisma.ts
git commit -m "feat: add Prisma schema (Team, Player) and client singleton"
```

---

### Task 3: Teams API

**Files:**
- Create: `lib/teams.ts`
- Create: `app/api/teams/route.ts`
- Create: `app/api/teams/[id]/route.ts`
- Create: `lib/types.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2)
- Produces:
  - `getTeamsWithRoster(): Promise<TeamWithRoster[]>` from `lib/teams.ts`, where `TeamWithRoster = Team & { players: Player[]; remainingCredits: number; spentCredits: number }`
  - `TeamSummary` type from `lib/types.ts`: `{ id: string; name: string; remainingCredits: number }` — used by later Player-facing pages/components
  - `GET /api/teams` → `TeamWithRoster[]`
  - `POST /api/teams` body `{ name, coach, totalCredits }` → created `Team`, 400 on invalid input
  - `PATCH /api/teams/[id]` body partial `{ name?, coach?, totalCredits? }` → updated `Team`
  - `DELETE /api/teams/[id]` → `{ ok: true }`, or 409 `{ error }` if the team has assigned players

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type TeamSummary = {
  id: string;
  name: string;
  remainingCredits: number;
};

export type PlayerWithTeam = {
  id: string;
  name: string;
  role: string;
  serieATeam: string;
  cost: number | null;
  starter: boolean;
  watchlist: boolean;
  fantasyTeam: { id: string; name: string } | null;
};
```

- [ ] **Step 2: Create `lib/teams.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function getTeamsWithRoster() {
  const teams = await prisma.team.findMany({
    include: { players: { orderBy: { role: "asc" } } },
    orderBy: { name: "asc" },
  });

  return teams.map((team) => {
    const spentCredits = team.players.reduce((sum, p) => sum + (p.cost ?? 0), 0);
    return {
      ...team,
      spentCredits,
      remainingCredits: team.totalCredits - spentCredits,
    };
  });
}
```

- [ ] **Step 3: Create `app/api/teams/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamsWithRoster } from "@/lib/teams";

export async function GET() {
  const teams = await getTeamsWithRoster();
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, coach, totalCredits } = body;

  if (!name || !coach || typeof totalCredits !== "number" || totalCredits < 0) {
    return NextResponse.json({ error: "Invalid team data" }, { status: 400 });
  }

  const team = await prisma.team.create({ data: { name, coach, totalCredits } });
  return NextResponse.json(team, { status: 201 });
}
```

- [ ] **Step 4: Create `app/api/teams/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const data: { name?: string; coach?: string; totalCredits?: number } = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.coach !== undefined) data.coach = body.coach;
  if (body.totalCredits !== undefined) {
    if (typeof body.totalCredits !== "number" || body.totalCredits < 0) {
      return NextResponse.json({ error: "Invalid totalCredits" }, { status: 400 });
    }
    data.totalCredits = body.totalCredits;
  }

  const team = await prisma.team.update({ where: { id: params.id }, data });
  return NextResponse.json(team);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playerCount = await prisma.player.count({ where: { fantasyTeamId: params.id } });

  if (playerCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete team with assigned players. Unassign players first." },
      { status: 409 }
    );
  }

  await prisma.team.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Verify manually**

```bash
npm run dev &
sleep 3

TEAM_ID=$(curl -s -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"Test FC","coach":"Mister X","totalCredits":500}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s http://localhost:3000/api/teams | grep -q "Test FC" && echo "OK: team listed"

curl -s -X PATCH http://localhost:3000/api/teams/$TEAM_ID \
  -H "Content-Type: application/json" \
  -d '{"coach":"Mister Y"}' | grep -q "Mister Y" && echo "OK: team updated"

curl -s -X DELETE http://localhost:3000/api/teams/$TEAM_ID | grep -q '"ok":true' && echo "OK: team deleted"

kill %1
```

Expected: three `OK:` lines. (The 409-on-delete-with-players path is exercised end-to-end in Task 7's verification, once player assignment exists.)

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/teams.ts app/api/teams
git commit -m "feat: add teams API with computed remaining credits"
```

---

### Task 4: Players API

**Files:**
- Create: `lib/players.ts`
- Create: `app/api/players/route.ts`
- Create: `app/api/players/[id]/route.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `PlayerWithTeam` type (Task 3)
- Produces:
  - `getFilteredPlayers(filters: PlayerFilters): Promise<PlayerWithTeam[]>` from `lib/players.ts`, where `PlayerFilters = { role?: string; serieATeam?: string; freeAgentOnly?: boolean; starterOnly?: boolean; watchlistOnly?: boolean; search?: string }`
  - `GET /api/players?role=&serieATeam=&freeAgentOnly=&starterOnly=&watchlistOnly=&search=` → `PlayerWithTeam[]`
  - `POST /api/players` body `{ name, role, serieATeam, starter? }` → created `Player`, 400 on invalid input
  - `PATCH /api/players/[id]` body partial `{ name?, role?, serieATeam?, starter?, watchlist?, fantasyTeamId?, cost? }` — setting `fantasyTeamId` to a team id requires `cost >= 0` in the same request (sets both); setting `fantasyTeamId` to `null` clears `cost` too (unassign) → updated `Player`

- [ ] **Step 1: Create `lib/players.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { Prisma, Role } from "@prisma/client";

export type PlayerFilters = {
  role?: string;
  serieATeam?: string;
  freeAgentOnly?: boolean;
  starterOnly?: boolean;
  watchlistOnly?: boolean;
  search?: string;
};

export async function getFilteredPlayers(filters: PlayerFilters) {
  const where: Prisma.PlayerWhereInput = {};

  if (filters.role) where.role = filters.role as Role;
  if (filters.serieATeam) where.serieATeam = filters.serieATeam;
  if (filters.freeAgentOnly) where.fantasyTeamId = null;
  if (filters.starterOnly) where.starter = true;
  if (filters.watchlistOnly) where.watchlist = true;
  if (filters.search) where.name = { contains: filters.search };

  return prisma.player.findMany({
    where,
    include: { fantasyTeam: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}
```

- [ ] **Step 2: Create `app/api/players/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFilteredPlayers } from "@/lib/players";

const VALID_ROLES = ["GK", "DEF", "MID", "FWD"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const players = await getFilteredPlayers({
    role: searchParams.get("role") ?? undefined,
    serieATeam: searchParams.get("serieATeam") ?? undefined,
    freeAgentOnly: searchParams.get("freeAgentOnly") === "true",
    starterOnly: searchParams.get("starterOnly") === "true",
    watchlistOnly: searchParams.get("watchlistOnly") === "true",
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, role, serieATeam, starter } = body;

  if (!name || !VALID_ROLES.includes(role) || !serieATeam) {
    return NextResponse.json({ error: "Invalid player data" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { name, role, serieATeam, starter: !!starter },
  });

  return NextResponse.json(player, { status: 201 });
}
```

- [ ] **Step 3: Create `app/api/players/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.serieATeam !== undefined) data.serieATeam = body.serieATeam;
  if (body.starter !== undefined) data.starter = !!body.starter;
  if (body.watchlist !== undefined) data.watchlist = !!body.watchlist;

  if (body.fantasyTeamId !== undefined) {
    if (body.fantasyTeamId === null) {
      data.fantasyTeamId = null;
      data.cost = null;
    } else {
      if (typeof body.cost !== "number" || body.cost < 0) {
        return NextResponse.json(
          { error: "cost is required (>= 0) when assigning a player to a team" },
          { status: 400 }
        );
      }
      data.fantasyTeamId = body.fantasyTeamId;
      data.cost = body.cost;
    }
  }

  const player = await prisma.player.update({ where: { id: params.id }, data });
  return NextResponse.json(player);
}
```

- [ ] **Step 4: Verify manually**

```bash
npm run dev &
sleep 3

TEAM_ID=$(curl -s -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"Test FC 2","coach":"Mister X","totalCredits":100}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

PLAYER_ID=$(curl -s -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -d '{"name":"Mario Rossi","role":"MID","serieATeam":"Milan","starter":true}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s "http://localhost:3000/api/players?freeAgentOnly=true" | grep -q "Mario Rossi" && echo "OK: free agent listed"

curl -s -X PATCH http://localhost:3000/api/players/$PLAYER_ID \
  -H "Content-Type: application/json" \
  -d "{\"fantasyTeamId\":\"$TEAM_ID\",\"cost\":30}" | grep -q '"cost":30' && echo "OK: player assigned"

curl -s http://localhost:3000/api/teams | grep -q '"remainingCredits":70' && echo "OK: remaining credits computed correctly"

curl -s -X DELETE http://localhost:3000/api/teams/$TEAM_ID | grep -q '"error"' && echo "OK: delete blocked with assigned player"

curl -s -X PATCH http://localhost:3000/api/players/$PLAYER_ID \
  -H "Content-Type: application/json" \
  -d '{"fantasyTeamId":null}' | grep -q '"cost":null' && echo "OK: player unassigned"

curl -s -X DELETE http://localhost:3000/api/teams/$TEAM_ID | grep -q '"ok":true' && echo "OK: delete succeeds once unassigned"

kill %1
```

Expected: six `OK:` lines.

- [ ] **Step 5: Commit**

```bash
git add lib/players.ts app/api/players
git commit -m "feat: add players API with filters and team assignment"
```

---

### Task 5: Import API

**Files:**
- Create: `app/api/import/route.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `xlsx` package (Task 1)
- Produces: `POST /api/import` — multipart form with fields `file` (CSV/XLSX) and `mapping` (JSON string `{ name: string; role: string; serieATeam: string }` naming which source columns map to which fields) → `{ imported: number; skipped: number; errors: string[] }`. Upserts players by `name`. Skips and reports rows with missing name/serieATeam or an invalid role instead of failing the whole import.

- [ ] **Step 1: Create `app/api/import/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["GK", "DEF", "MID", "FWD"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mappingRaw = formData.get("mapping") as string | null;

  if (!file || !mappingRaw) {
    return NextResponse.json({ error: "file and mapping are required" }, { status: 400 });
  }

  const mapping = JSON.parse(mappingRaw) as {
    name: string;
    role: string;
    serieATeam: string;
  };

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  let imported = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const name = String(row[mapping.name] ?? "").trim();
    const roleRaw = String(row[mapping.role] ?? "").trim().toUpperCase();
    const serieATeam = String(row[mapping.serieATeam] ?? "").trim();
    const rowNumber = index + 2; // header row is row 1

    if (!name) {
      errors.push(`Riga ${rowNumber}: nome mancante`);
      continue;
    }
    if (!VALID_ROLES.includes(roleRaw)) {
      errors.push(`Riga ${rowNumber}: ruolo non valido "${roleRaw}"`);
      continue;
    }
    if (!serieATeam) {
      errors.push(`Riga ${rowNumber}: squadra Serie A mancante`);
      continue;
    }

    const existing = await prisma.player.findFirst({ where: { name } });
    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { role: roleRaw as never, serieATeam },
      });
    } else {
      await prisma.player.create({
        data: { name, role: roleRaw as never, serieATeam },
      });
    }
    imported++;
  }

  return NextResponse.json({ imported, skipped: errors.length, errors });
}
```

- [ ] **Step 2: Verify manually with a sample CSV**

```bash
npm run dev &
sleep 3

cat > /tmp/sample-players.csv <<'EOF'
Nome,Ruolo,Squadra
Luigi Bianchi,DEF,Inter
Paolo Verdi,INVALID,Roma
EOF

curl -s -X POST http://localhost:3000/api/import \
  -F "file=@/tmp/sample-players.csv" \
  -F 'mapping={"name":"Nome","role":"Ruolo","serieATeam":"Squadra"}' | tee /tmp/import-result.json

grep -q '"imported":1' /tmp/import-result.json && echo "OK: one row imported"
grep -q '"skipped":1' /tmp/import-result.json && echo "OK: one invalid row skipped and reported"

curl -s "http://localhost:3000/api/players?search=Luigi" | grep -q "Luigi Bianchi" && echo "OK: imported player queryable"

kill %1
```

Expected: three `OK:` lines.

- [ ] **Step 3: Commit**

```bash
git add app/api/import
git commit -m "feat: add CSV/Excel player import with configurable column mapping"
```

---

### Task 6: Teams page

**Files:**
- Create: `app/teams/page.tsx`
- Create: `app/teams/TeamForm.tsx`
- Create: `app/teams/DeleteTeamButton.tsx`

**Interfaces:**
- Consumes: `getTeamsWithRoster()` (Task 3), `POST/PATCH/DELETE /api/teams[...]` (Task 3)
- Produces: `/teams` route — team roster summary, create/edit team form, delete-with-guard button. No exports consumed by later tasks.

- [ ] **Step 1: Create `app/teams/TeamForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string; coach: string; totalCredits: number };

export default function TeamForm({
  mode,
  team,
}: {
  mode: "create" | "edit";
  team?: Team;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team?.name ?? "");
  const [coach, setCoach] = useState(team?.coach ?? "");
  const [totalCredits, setTotalCredits] = useState(team?.totalCredits ?? 500);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const url = mode === "create" ? "/api/teams" : `/api/teams/${team!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, coach, totalCredits: Number(totalCredits) }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Errore");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        {mode === "create" ? "Nuova squadra" : "Modifica"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome squadra"
        required
        className="border rounded px-2 py-1 text-sm"
      />
      <input
        value={coach}
        onChange={(e) => setCoach(e.target.value)}
        placeholder="Allenatore"
        required
        className="border rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        value={totalCredits}
        onChange={(e) => setTotalCredits(Number(e.target.value))}
        min={0}
        required
        className="border rounded px-2 py-1 text-sm w-24"
      />
      <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
        Salva
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
        Annulla
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </form>
  );
}
```

- [ ] **Step 2: Create `app/teams/DeleteTeamButton.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function DeleteTeamButton({
  teamId,
  disabled,
}: {
  teamId: string;
  disabled: boolean;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Eliminare questa squadra?")) return;

    const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "Errore");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={disabled}
      title={disabled ? "Svincola prima tutti i giocatori" : undefined}
      className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Elimina
    </button>
  );
}
```

- [ ] **Step 3: Create `app/teams/page.tsx`**

```tsx
import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "./TeamForm";
import DeleteTeamButton from "./DeleteTeamButton";

const ROLE_ORDER = ["GK", "DEF", "MID", "FWD"] as const;
const ROLE_LABELS: Record<string, string> = {
  GK: "Portieri",
  DEF: "Difensori",
  MID: "Centrocampisti",
  FWD: "Attaccanti",
};

export default async function TeamsPage() {
  const teams = await getTeamsWithRoster();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Squadre</h1>
        <TeamForm mode="create" />
      </div>

      {teams.map((team) => (
        <section key={team.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold">{team.name}</h2>
              <p className="text-sm text-gray-500">Allenatore: {team.coach}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Spesi: {team.spentCredits} / {team.totalCredits}
                </p>
                <p className="font-semibold">Residui: {team.remainingCredits}</p>
              </div>
              <TeamForm mode="edit" team={team} />
              <DeleteTeamButton teamId={team.id} disabled={team.players.length > 0} />
            </div>
          </div>

          {ROLE_ORDER.map((role) => {
            const rolePlayers = team.players.filter((p) => p.role === role);
            if (rolePlayers.length === 0) return null;
            return (
              <div key={role} className="mt-3">
                <h3 className="text-sm font-medium text-gray-600">{ROLE_LABELS[role]}</h3>
                <ul className="divide-y">
                  {rolePlayers.map((p) => (
                    <li key={p.id} className="flex justify-between py-1">
                      <span>
                        {p.name} <span className="text-gray-400 text-sm">({p.serieATeam})</span>
                      </span>
                      <span className="font-medium">{p.cost}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {team.players.length === 0 && (
            <p className="text-gray-400 text-sm mt-2">Nessun giocatore assegnato.</p>
          )}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000/teams | grep -q "Squadre" && echo "OK: teams page renders"
kill %1
```

Then open `http://localhost:3000/teams` in a browser: create a team via "Nuova squadra", confirm it appears with `Residui: <totalCredits>` and an enabled "Elimina" button (empty roster); delete it and confirm it disappears.

- [ ] **Step 5: Commit**

```bash
git add app/teams
git commit -m "feat: add teams page with roster summary and CRUD"
```

---

### Task 7: Players page (browse, filter, add, assign, watchlist)

**Files:**
- Create: `app/players/page.tsx`
- Create: `app/players/PlayerFilters.tsx`
- Create: `app/players/AddPlayerForm.tsx`
- Create: `app/players/PlayersTable.tsx`

**Interfaces:**
- Consumes: `getFilteredPlayers()` (Task 4), `getTeamsWithRoster()` (Task 3), `PlayerWithTeam`/`TeamSummary` types (Task 3), `POST/PATCH /api/players[...]` (Task 4)
- Produces: `/players` route. `PlayersTable` component (props: `players: PlayerWithTeam[]`, `teams: TeamSummary[]`) is reused by the watchlist page in Task 9.

- [ ] **Step 1: Create `app/players/PlayerFilters.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const ROLES = ["GK", "DEF", "MID", "FWD"];

export default function PlayerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(key: string) {
    const current = searchParams.get(key) === "true";
    update(key, current ? "" : "true");
  }

  return (
    <div className="flex flex-wrap gap-3 items-center border rounded p-3">
      <input
        placeholder="Cerca per nome"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => update("search", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
      <select
        defaultValue={searchParams.get("role") ?? ""}
        onChange={(e) => update("role", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">Tutti i ruoli</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        placeholder="Squadra Serie A"
        defaultValue={searchParams.get("serieATeam") ?? ""}
        onChange={(e) => update("serieATeam", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
      <label className="text-sm flex items-center gap-1">
        <input
          type="checkbox"
          checked={searchParams.get("freeAgentOnly") === "true"}
          onChange={() => toggle("freeAgentOnly")}
        />
        Solo svincolati
      </label>
      <label className="text-sm flex items-center gap-1">
        <input
          type="checkbox"
          checked={searchParams.get("starterOnly") === "true"}
          onChange={() => toggle("starterOnly")}
        />
        Solo titolari
      </label>
      <label className="text-sm flex items-center gap-1">
        <input
          type="checkbox"
          checked={searchParams.get("watchlistOnly") === "true"}
          onChange={() => toggle("watchlistOnly")}
        />
        Solo watchlist
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/players/AddPlayerForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["GK", "DEF", "MID", "FWD"];

export default function AddPlayerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("GK");
  const [serieATeam, setSerieATeam] = useState("");
  const [starter, setStarter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, serieATeam, starter }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Errore");
      return;
    }

    setName("");
    setSerieATeam("");
    setStarter(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
      >
        Aggiungi giocatore
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-10"
    >
      <div className="bg-white rounded-lg p-6 space-y-3 w-80">
        <h2 className="font-semibold">Nuovo giocatore</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome e cognome"
          required
          className="border rounded px-2 py-1 w-full text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border rounded px-2 py-1 w-full text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          value={serieATeam}
          onChange={(e) => setSerieATeam(e.target.value)}
          placeholder="Squadra Serie A"
          required
          className="border rounded px-2 py-1 w-full text-sm"
        />
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
          Titolare
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
            Annulla
          </button>
          <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
            Salva
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/players/PlayersTable.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";

export default function PlayersTable({
  players,
  teams,
}: {
  players: PlayerWithTeam[];
  teams: TeamSummary[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);

  async function toggleWatchlist(player: PlayerWithTeam) {
    await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: !player.watchlist }),
    });
    router.refresh();
  }

  async function unassign(player: PlayerWithTeam) {
    await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: null }),
    });
    router.refresh();
  }

  return (
    <>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Nome</th>
            <th>Ruolo</th>
            <th>Squadra Serie A</th>
            <th>Titolare</th>
            <th>Stato</th>
            <th>Costo</th>
            <th>Watchlist</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-1.5">{p.name}</td>
              <td>{p.role}</td>
              <td>{p.serieATeam}</td>
              <td>{p.starter ? "Sì" : "-"}</td>
              <td>{p.fantasyTeam ? p.fantasyTeam.name : "Svincolato"}</td>
              <td>{p.cost ?? "-"}</td>
              <td>
                <button onClick={() => toggleWatchlist(p)} title="Watchlist">
                  {p.watchlist ? "★" : "☆"}
                </button>
              </td>
              <td>
                {p.fantasyTeam ? (
                  <button onClick={() => unassign(p)} className="text-red-600 text-xs">
                    Svincola
                  </button>
                ) : (
                  <button onClick={() => setAssigning(p)} className="text-blue-600 text-xs">
                    Assegna
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {assigning && (
        <AssignModal
          player={assigning}
          teams={teams}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setAssigning(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function AssignModal({
  player,
  teams,
  onClose,
  onAssigned,
}: {
  player: PlayerWithTeam;
  teams: TeamSummary[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === teamId);
  const overBudget = selectedTeam ? cost > selectedTeam.remainingCredits : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: teamId, cost }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Errore");
      return;
    }

    onAssigned();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-10"
    >
      <div className="bg-white rounded-lg p-6 space-y-3 w-80">
        <h2 className="font-semibold">Assegna {player.name}</h2>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="border rounded px-2 py-1 w-full text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (residui: {t.remainingCredits})
            </option>
          ))}
        </select>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          min={0}
          required
          className="border rounded px-2 py-1 w-full text-sm"
        />
        {overBudget && (
          <p className="text-orange-600 text-sm">
            Attenzione: costo superiore ai crediti residui della squadra.
          </p>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Annulla
          </button>
          <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
            Conferma
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create `app/players/page.tsx`**

```tsx
import Link from "next/link";
import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import PlayerFilters from "./PlayerFilters";
import PlayersTable from "./PlayersTable";
import AddPlayerForm from "./AddPlayerForm";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const filters = {
    role: searchParams.role,
    serieATeam: searchParams.serieATeam,
    freeAgentOnly: searchParams.freeAgentOnly === "true",
    starterOnly: searchParams.starterOnly === "true",
    watchlistOnly: searchParams.watchlistOnly === "true",
    search: searchParams.search,
  };

  const [players, teams] = await Promise.all([
    getFilteredPlayers(filters),
    getTeamsWithRoster(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Giocatori</h1>
        <div className="flex gap-2">
          <Link href="/players/import" className="px-3 py-1.5 border rounded text-sm">
            Import
          </Link>
          <AddPlayerForm />
        </div>
      </div>
      <PlayerFilters />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits }))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify manually**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000/players | grep -q "Giocatori" && echo "OK: players page renders"
kill %1
```

Then in a browser at `http://localhost:3000/players`:
1. Click "Aggiungi giocatore", create a player → appears in the table as "Svincolato".
2. Apply filters (role, free-agent-only, search) → table updates via URL params.
3. Click the watchlist star → toggles, persists after refresh.
4. Create a team at `/teams`, come back, click "Assegna" on the player, pick the team, enter a cost higher than its remaining credits → orange warning shown but submit still succeeds.
5. Click "Svincola" → player returns to "Svincolato", cost cleared, team's remaining credits restored (check `/teams`).

- [ ] **Step 6: Commit**

```bash
git add app/players/page.tsx app/players/PlayerFilters.tsx app/players/AddPlayerForm.tsx app/players/PlayersTable.tsx
git commit -m "feat: add players page with filters, manual add, assign, watchlist"
```

---

### Task 8: Import page

**Files:**
- Create: `app/players/import/page.tsx`

**Interfaces:**
- Consumes: `POST /api/import` (Task 5)
- Produces: `/players/import` route. No exports consumed by later tasks.

**Note:** The exact source file layout (real listone) is unknown until the user supplies a sample — this page reads headers client-side and lets the user map them interactively, so it works with any column layout. Role values in the file must map to `GK`/`DEF`/`MID`/`FWD` after uppercasing; if the real file uses Italian codes (P/D/C/A) this mapping step will need a small adjustment once the sample file is available — expected, not a defect.

- [ ] **Step 1: Create `app/players/import/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type ImportResult = { imported: number; skipped: number; errors: string[] };

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ name: "", role: "", serieATeam: "" });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);

    const buffer = await selected.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    setHeaders(cols);
    setMapping({ name: cols[0] ?? "", role: cols[1] ?? "", serieATeam: cols[2] ?? "" });
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    const res = await fetch("/api/import", { method: "POST", body: formData });
    const body: ImportResult = await res.json();
    setResult(body);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Import giocatori</h1>

      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} />

      {headers.length > 0 && (
        <div className="space-y-2 border rounded p-4">
          <p className="text-sm text-gray-500">Associa le colonne del file ai campi:</p>
          {(["name", "role", "serieATeam"] as const).map((field) => (
            <div key={field} className="flex items-center gap-2">
              <label className="w-32 text-sm">{field}</label>
              <select
                value={mapping[field]}
                onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">-- seleziona colonna --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <p className="text-xs text-gray-400">
            Ruolo atteso nel file: GK, DEF, MID o FWD (case-insensitive).
          </p>
          <button
            onClick={handleImport}
            disabled={loading || !mapping.name || !mapping.role || !mapping.serieATeam}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-40"
          >
            {loading ? "Importazione..." : "Importa"}
          </button>
        </div>
      )}

      {result && (
        <div className="border rounded p-4 text-sm space-y-1">
          <p>Importati: {result.imported}</p>
          <p>Scartati: {result.skipped}</p>
          {result.errors.length > 0 && (
            <ul className="text-red-600 list-disc list-inside">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

In a browser at `http://localhost:3000/players/import`: upload the `/tmp/sample-players.csv` file created in Task 5, confirm the three headers (`Nome`, `Ruolo`, `Squadra`) appear as mapping options and are auto-selected in order, click "Importa", confirm the result panel shows `Importati: 1`, `Scartati: 1`, and the invalid-role error message. Then check `/players` — "Luigi Bianchi" appears.

- [ ] **Step 3: Commit**

```bash
git add app/players/import
git commit -m "feat: add import page with client-side column mapping preview"
```

---

### Task 9: Watchlist page

**Files:**
- Create: `app/watchlist/page.tsx`

**Interfaces:**
- Consumes: `getFilteredPlayers()` (Task 4), `getTeamsWithRoster()` (Task 3), `PlayersTable` (Task 7)
- Produces: `/watchlist` route.

- [ ] **Step 1: Create `app/watchlist/page.tsx`**

```tsx
import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import PlayersTable from "../players/PlayersTable";

export default async function WatchlistPage() {
  const [players, teams] = await Promise.all([
    getFilteredPlayers({ watchlistOnly: true, freeAgentOnly: true }),
    getTeamsWithRoster(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

In a browser: on `/players`, star a free-agent player to add it to the watchlist. Visit `/watchlist` — confirm it appears. Assign it to a team from the watchlist page's "Assegna" button. Refresh `/watchlist` — confirm it disappears (no longer a free agent).

- [ ] **Step 3: Commit**

```bash
git add app/watchlist
git commit -m "feat: add watchlist page"
```

---

### Task 10: Navigation and home redirect

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `/players`, `/players/import`, `/teams`, `/watchlist` routes (Tasks 6–9)
- Produces: top nav present on every page; `/` redirects to `/players`.

- [ ] **Step 1: Update `app/layout.tsx`**

```tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <nav className="border-b border-gray-200 px-6 py-3 flex gap-6">
          <Link href="/players" className="font-medium hover:underline">
            Giocatori
          </Link>
          <Link href="/players/import" className="font-medium hover:underline">
            Import
          </Link>
          <Link href="/teams" className="font-medium hover:underline">
            Squadre
          </Link>
          <Link href="/watchlist" className="font-medium hover:underline">
            Watchlist
          </Link>
        </nav>
        <div className="p-6">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update `app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/players");
}
```

- [ ] **Step 3: Verify manually**

```bash
npm run dev &
sleep 3
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3000 | grep -q "/players" && echo "OK: home redirects to /players"
kill %1
```

Then in a browser, confirm the nav bar (Giocatori / Import / Squadre / Watchlist) is present and functional on all four pages.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: add navigation and home redirect"
```
