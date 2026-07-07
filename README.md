<div align="center">

![MJW Design](https://mjwdesign.ca/wp-content/uploads/2024/01/mjw-design-logo.png)

**Built with [MJW Design](https://mjwdesign.ca) — AI-Powered Development**

---

</div>

# MJW Lock Mapping Studio

A premium browser-based tool for escape room designers to plan, validate, and document physical lock and puzzle assignments across room zones. It helps design lock inventories, build zone configurations, map puzzles to locks, audit risks, generate AI-assisted lock maps, and export implementation cards — with optional **PocketBase cloud saves** and an optional **AI Lock Map Generator** powered by Anthropic Claude through a secure Netlify Function.

## Screenshots

| Desktop Studio View | Zone Builder & Puzzle Matrix |
| :---- | :---- |
| MJW Lock Mapping Studio desktop interface placeholder | MJW Lock Mapping Studio zone builder and puzzle matrix placeholder |

## What It Does

Unlike spreadsheet-based lock tracking or generic project tools, this studio uses the language and workflow that escape room operators already use when staging physical locks, setting combinations, and handing off rooms to game masters.

| Panel | Purpose |
| :---- | :---- |
| **Project Setup** | Configure room name, difficulty, player count, and session metadata. |
| **Lock Inventory** | Catalogue every physical lock in the room — type, combination, and current assignment. |
| **Zone Builder** | Divide the room into logical zones and assign locks to each zone. |
| **Puzzle Matrix** | Map each puzzle step to its required lock, zone, and solution path. |
| **Risk Audit** | Identify double-assigned locks, uncovered zones, orphaned puzzles, and combination conflicts. |
| **Implementation Cards** | Generate printable GM handoff cards for each zone and lock assignment. |
| **Export Panel** | Download the full lock map as a structured Markdown document. |

**Key interactions:**

- Configure the project in Project Setup before building zones or assigning locks.
- Add locks to the inventory with type, combination, and notes.
- Build zones and drag locks into each zone's assignment list.
- Use the Puzzle Matrix to connect each puzzle to a lock and verify solve order.
- Run the Risk Audit to catch assignment conflicts, missing solutions, or unreachable puzzle paths before printing cards.
- Generate AI-assisted lock map suggestions through the secure Netlify Function powered by Anthropic Claude.
- Export implementation cards for game masters or export the full plan to Markdown for documentation.

## How to Use

The app opens with a demo project so new users can see a complete lock map immediately. Start by visiting Project Setup to name the room and configure parameters, then add physical locks to the Lock Inventory. Build zones in the Zone Builder and assign locks to each zone. Use the Puzzle Matrix to wire puzzle steps to lock assignments. Before printing, run the Risk Audit to surface conflicts. When the map is ready, generate Implementation Cards for your game master team or export to Markdown for your build documentation.

The studio is designed for **desktop use**. Detailed matrix editing, zone building, and card review work best on a laptop or desktop display. Mobile access is supported for reviewing and exporting existing projects.

## Stack

| Layer | Technology |
| :---- | :---- |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Optional cloud persistence | PocketBase |
| AI backend | Netlify Functions + Anthropic Claude (via `@anthropic-ai/sdk`) |
| Blob storage | Netlify Blobs |
| Hosting | Netlify |

## Local Development

```bash
npm install
```

```bash
npm run dev
```

The app works fully with **no environment variables**. Without PocketBase or Anthropic API variables, it runs as a local browser app using in-memory and demo project state with full export support.

## Quality Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run build
```

## Available Scripts

```bash
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check
npm run typecheck  # TypeScript type check (no emit)
```

## Environment Variables

All environment variables are optional unless you enable the related feature. The app remains production-usable in local-only mode with no configured variables.

| Variable | Required? | Scope | Enables | Description |
| :---- | :---- | :---- | :---- | :---- |
| `VITE_POCKETBASE_URL` | Optional | Frontend/public | PocketBase sign-in and cloud project saves | Public PocketBase/PocketHost URL for user authentication and project record CRUD. Example: `https://immersive-kit.pockethost.io`. |
| `ANTHROPIC_API_KEY` | Optional | Netlify Function/server only | AI Lock Map Generator through Anthropic Claude | Server-side Anthropic API key. Used by the `generate-lockmap` Netlify Function. Never expose this as a `VITE_` variable. |
| `VITE_APP_ENV` | Optional | Frontend/public | Environment-aware behaviour | Set to `development` or `production`. Defaults to `development` when absent. |

## Saved Projects and PocketBase Cloud Saves

The app works fully with **no environment variables**. In local-only mode, the demo project and any in-session work remain available, and users can export the full lock map to Markdown at any time.

Cloud saves are optional. When `VITE_POCKETBASE_URL` is configured, authenticated users can persist lock map projects to PocketBase. Normal user authentication runs through the public PocketBase URL; **no PocketBase superuser token is placed in frontend code**.

### Recommended `lock_maps` Collection

Create a PocketBase collection named `lock_maps`. The implementation expects authenticated users to own their own records through an `owner` relation field. For the MJW canonical schema, configure the following fields.

| Field | Type | Notes |
| :---- | :---- | :---- |
| `title` | text | Display name for the project in the saved projects panel. |
| `description` | text | Optional room or project notes. |
| `owner` | relation to `users` | Should point to the authenticated user. |
| `project_json` | json | Stores the full lock map project — locks, zones, puzzle matrix, and metadata. |
| `visibility` | select | Recommended values: `private`, `shared`, `public`. |
| `version` | number | Incremented on saves for conflict detection. |
| `created` | system field | Managed by PocketBase. |
| `updated` | system field | Managed by PocketBase; used by the app for conflict checks. |

Recommended collection rules should allow authenticated users to create records for themselves and only read, update, or delete their own records. A practical rule pattern is `@request.auth.id != "" && owner = @request.auth.id` for user-scoped list/view/update/delete rules. The create rule should require authentication and an owner value matching the authenticated user.

## AI Lock Map Generator Setup

The AI Lock Map Generator is implemented across three Netlify Functions:

- `netlify/functions/generate-lockmap.ts` — initiates the AI generation job
- `netlify/functions/generate-lockmap-background.ts` — runs the Claude generation as a background task
- `netlify/functions/generate-lockmap-status.ts` — polls job status using Netlify Blobs

Browser code calls `/.netlify/functions/generate-lockmap`; it never calls Anthropic directly and never includes API keys in frontend code. Configure `ANTHROPIC_API_KEY` in your Netlify site settings under **Site configuration → Environment variables**. After adding the variable, redeploy the site. If no API key is configured, the app displays a setup message rather than failing silently.

## Netlify Deployment

The `netlify.toml` at the project root configures the Vite build, static routing, and function bundling. To deploy on Netlify, connect this GitHub repository and use the following production settings.

| Setting | Value |
| :---- | :---- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Node version | 20 |
| Function bundler | esbuild |

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Deploy first with no environment variables to confirm the local-only app works, then add `VITE_POCKETBASE_URL` for cloud saves and `ANTHROPIC_API_KEY` for AI-assisted lock map generation if those features are needed.

## Accessibility and Production Readiness

The studio UI includes accessible labels on all major panel actions, inventory controls, zone assignment interactions, audit indicators, and export controls. Empty states across each panel are intentionally explicit so the workflow remains understandable before optional services are configured. The demo project loads automatically so the app is never blank on first use.

## Project Structure

```
src/
  components/
    ExportPanel.tsx           # Markdown export UI
    ImplementationCards.tsx   # Printable GM handoff card generator
    Layout.tsx                # App shell and navigation
    LockInventory.tsx         # Physical lock catalogue and management
    ProjectSetup.tsx          # Room and session configuration
    PuzzleMatrix.tsx          # Puzzle-to-lock mapping table
    RiskAudit.tsx             # Assignment conflict and coverage audit
    ZoneBuilder.tsx           # Room zone configuration and lock assignment
  data/
    demoProject.ts            # Starter demo lock map project
  lib/
    lockmap.ts                # Core lock map state and helpers
    pocketbase.ts             # Optional PocketBase client wrapper
  types/
    lockmap.ts                # Shared lock map and project types
  utils/
    exportMarkdown.ts         # Markdown export helper
    generateCards.ts          # Implementation card generation logic
    lockMappingRules.ts       # Validation and mapping rule definitions
    seedFromGenerated.ts      # Seeds project state from AI-generated output
  App.tsx                     # Root layout + panel routing
  main.tsx                    # Entry point

netlify/
  functions/
    _lockmapAudit.ts                  # Shared audit logic for functions
    generate-lockmap.ts               # AI generation job initiator
    generate-lockmap-background.ts    # Background Claude generation task
    generate-lockmap-status.ts        # Job status polling via Netlify Blobs
```

## Changelog

### v0.1.0 — Initial Studio Release

- Delivered Lock Inventory, Zone Builder, Puzzle Matrix, Risk Audit, Implementation Cards, and Export panels.
- Added demo project so the app is immediately usable on first load.
- Added AI Lock Map Generator through secure Netlify Functions with Anthropic Claude and background job status polling via Netlify Blobs.
- Added optional PocketBase cloud save support with user-scoped authentication.
- Added Markdown export for full lock map documentation handoff.
- Configured Netlify deployment with esbuild function bundling and Node 20 environment.

---

Part of the **MJW Personal App Platform**.