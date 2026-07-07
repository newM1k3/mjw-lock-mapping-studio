<div align="center">

![MJW Design](https://mjwdesign.ca/wp-content/uploads/2024/01/mjw-design-logo.png)

**Built with [MJW Design](https://mjwdesign.ca) — AI-Powered Development**

---

</div>

# MJW Lock Mapping Studio

A structured lock-mapping and puzzle-integration tool for escape room designers. It helps plan, validate, generate, and export lock assignments, zone layouts, puzzle matrices, and implementation cards — with escape-room-specific terminology built in from the ground up. The app includes a local demo project mode, optional **PocketBase cloud saves**, Markdown export, risk auditing, and an optional **AI Lock Map Generator** that produces complete lock mappings through a secure Netlify Function powered by Anthropic Claude.

## Screenshots

| Project Setup & Zone Builder | Puzzle Matrix & Risk Audit |
| :---- | :---- |
| MJW Lock Mapping Studio project setup interface — placeholder | MJW Lock Mapping Studio puzzle matrix and risk audit view — placeholder |

## What It Does

Unlike generic spreadsheet or whiteboard tools, Lock Mapping Studio uses the vocabulary and structure that escape room operators already work with: zones, locks, puzzles, implementation cards, and risk audits.

| Module | Purpose |
| :---- | :---- |
| **Project Setup** | Define the room name, player count range, target duration, and difficulty tier before mapping begins. |
| **Zone Builder** | Create and name the physical zones of the room and assign locks to each zone. |
| **Lock Inventory** | Track every lock in the room — type, combination, assigned zone, and reset instructions. |
| **Puzzle Matrix** | Map each puzzle to its input locks and output results, giving a full dependency view of the room. |
| **Implementation Cards** | Generate printable per-puzzle instruction cards for game masters and build teams. |
| **Risk Audit** | Identify structural risks such as single points of failure, unreachable locks, and pacing imbalances. |
| **AI Lock Map Generator** | Submit room parameters to Claude and receive a complete suggested lock map as a starting point. |
| **Export** | Download the full lock map as a structured Markdown file for documentation and handoff. |

**Key interactions:**

- Define room parameters in Project Setup before generating or building a map manually.
- Add zones in Zone Builder and assign locks to each zone for physical layout clarity.
- Use the Lock Inventory to record every lock's type, combination, and reset procedure.
- Fill in the Puzzle Matrix to model how puzzles chain together through locks.
- Generate Implementation Cards automatically from the matrix for GM and build team use.
- Run the Risk Audit to catch structural issues before fabrication or playtesting.
- Use the AI Lock Map Generator to produce an initial map from room parameters with Claude.
- Export the completed map to Markdown for sharing with clients, builders, or your own records.

## How to Use

The app opens in demo project mode so new users can immediately explore a complete, pre-populated lock map. Start by editing the Project Setup with your room's parameters, then build out zones and add locks to the inventory. Fill in the Puzzle Matrix to define dependencies, review the Risk Audit for structural warnings, and generate Implementation Cards when the design stabilises. Use the AI Lock Map Generator to bootstrap a new room quickly, or build the map manually from scratch.

The tool is designed for desktop use where table editing, card review, and detailed form work are most comfortable. Mobile viewports are supported for reviewing and exporting existing maps.

## Stack

| Layer | Technology |
| :---- | :---- |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Optional cloud persistence | PocketBase |
| AI backend | Netlify Functions + Anthropic Claude SDK |
| Blob storage | @netlify/blobs |
| Hosting | Netlify |

## Local Development

```
npm install
```

```
npm run dev
```

The app works fully with **no environment variables** configured. Without PocketBase or Anthropic variables, it runs as a local browser app using the built-in demo project. The AI Lock Map Generator and cloud save features are simply unavailable until the relevant variables are set.

## Quality Checks

```
npm run typecheck
```

```
npm run lint
```

```
npm run build
```

## Available Scripts

```
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check
npm run typecheck  # TypeScript type check (no emit)
```

## Environment Variables

All environment variables are optional unless you enable the related feature. The app is fully usable in local/demo mode with no configured variables.

| Variable | Required? | Scope | Enables | Description |
| :---- | :---- | :---- | :---- | :---- |
| `VITE_POCKETBASE_URL` | Optional | Frontend/public | PocketBase sign-in and cloud project saves | Public PocketBase/PocketHost URL for user authentication and project record storage. Example: `https://immersive-kit.pockethost.io`. |
| `ANTHROPIC_API_KEY` | Optional | Netlify Function/server only | AI Lock Map Generator through Claude | Server-side Anthropic API key. Used exclusively inside the `generate-lockmap` Netlify Function. Never expose this as a `VITE_` variable. |
| `VITE_APP_ENV` | Optional | Frontend/public | Environment-aware behaviour | Set to `development` or `production`. Controls debug logging and demo-mode defaults. |

## Cloud Saves and PocketBase

The app runs fully offline using the built-in demo project and local state with **no environment variables** required. In local-only mode, users can still build, audit, and export a complete lock map without any account or network dependency.

Cloud saves are optional. When `VITE_POCKETBASE_URL` is configured, users can authenticate and persist their lock map projects to PocketBase. Normal user authentication runs through the public PocketBase URL; **no PocketBase superuser token is placed in frontend code**.

### Recommended `lock_maps` Collection

Create a PocketBase collection named `lock_maps`. The implementation expects authenticated users to own their own records through an `owner` relation field.

| Field | Type | Notes |
| :---- | :---- | :---- |
| `title` | text | Display name for the project. |
| `room_name` | text | The escape room's name. |
| `owner` | relation to `users` | Should point to the authenticated user. |
| `project_json` | json | Full serialised lock map including zones, locks, puzzles, and matrix. |
| `visibility` | select | Recommended values: `private`, `shared`, `public`. |
| `version` | number | Incremented on save to support conflict detection. |
| `created` | system field | Managed by PocketBase. |
| `updated` | system field | Managed by PocketBase and used by the app for conflict checks. |

Recommended collection rules should restrict all read, update, and delete operations to the record owner. A practical rule pattern is `@request.auth.id != "" && owner = @request.auth.id` for user-scoped list/view/update/delete. The create rule should require authentication and an owner value matching the authenticated user.

## AI Lock Map Generator Setup

The AI Lock Map Generator is implemented across `netlify/functions/generate-lockmap.ts`, `generate-lockmap-background.ts`, and `generate-lockmap-status.ts`. The background function pattern is used to handle Claude's response time gracefully, with a status-polling endpoint so the browser can track generation progress. An internal `_lockmapAudit.ts` helper validates the generated output before it is returned to the client.

Browser code calls `/.netlify/functions/generate-lockmap`; it never calls Anthropic directly and never includes the API key in frontend code.

Configure the Anthropic provider in your Netlify site settings under **Site configuration → Environment variables**. After adding environment variables, redeploy the Netlify site. If no API key is configured, the app displays a setup message rather than failing silently.

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

Deploy first with no environment variables to confirm the demo-mode app works, then add `VITE_POCKETBASE_URL` for cloud project saves and `ANTHROPIC_API_KEY` for the AI Lock Map Generator if those features are needed.

## Accessibility and Production Readiness

The release UI includes accessible labels on major actions across all modules: project setup controls, zone and lock management, matrix editing, card generation, risk audit results, AI generation triggers, and export actions. Empty and unconfigured states are intentionally explicit so the app remains understandable and usable before optional services are connected.

## Project Structure

```
src/
  components/
    ExportPanel.tsx           # Markdown export UI and download trigger
    ImplementationCards.tsx   # Auto-generated GM and build team cards
    Layout.tsx                # App shell, navigation, and panel switching
    LockInventory.tsx         # Lock type, combination, and reset tracking
    ProjectSetup.tsx          # Room parameters and project configuration
    PuzzleMatrix.tsx          # Puzzle-to-lock dependency matrix editor
    RiskAudit.tsx             # Structural risk detection and warnings
    ZoneBuilder.tsx           # Physical zone definition and lock assignment
  data/
    demoProject.ts            # Pre-populated demo project for onboarding
  lib/
    lockmap.ts                # Core lock map logic and state helpers
    pocketbase.ts             # Optional PocketBase client wrapper
  types/
    lockmap.ts                # Shared lock map, zone, puzzle, and lock types
  utils/
    exportMarkdown.ts         # Markdown serialisation for full project export
    generateCards.ts          # Implementation card generation logic
    lockMappingRules.ts       # Validation rules and risk audit logic
    seedFromGenerated.ts      # Applies AI-generated map data to app state
  App.tsx                     # Root layout and module routing
  main.tsx                    # Entry point

netlify/
  functions/
    generate-lockmap.ts           # Entry point — validates input, starts background job
    generate-lockmap-background.ts # Long-running Claude generation function
    generate-lockmap-status.ts    # Polling endpoint for generation progress
    _lockmapAudit.ts              # Internal validation of Claude's output
```

## Changelog

### v1.0.0 — Production Readiness Release

- Added full project setup, zone builder, lock inventory, puzzle matrix, implementation cards, risk audit, and Markdown export modules.
- Added AI Lock Map Generator using Anthropic Claude through secure Netlify Functions with background-job and status-polling architecture.
- Added demo project mode for onboarding with no configuration required.
- Added optional PocketBase cloud save support with local-only fallback.
- Added README, Netlify deployment instructions, environment variable documentation, and this changelog.

### Previous Build Milestones

- Added `_lockmapAudit.ts` validation layer to verify AI-generated maps before delivery to the client.
- Added `seedFromGenerated.ts` utility to apply AI output directly into app state.
- Added Markdown export, implementation card generation, and lock mapping rules engine.
- Established zone-scoped lock inventory and puzzle-level dependency matrix as the core data model.

---

Part of the **MJW Personal App Platform**.