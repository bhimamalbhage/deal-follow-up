# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deal Follow-Up is an autonomous sales follow-up agent. It monitors HubSpot deal activity, detects stale leads, uses AI to draft context-aware follow-up emails, and delivers them to reps in Slack for one-click approval. Approved emails send via HubSpot and auto-update deal records.

**Core loop:** Detect → Score → Draft → Approve → Execute

**Integrations:** HubSpot (deals, emails, contacts), Slack (Block Kit notifications), AI (urgency scoring + email drafting)

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript (strict mode)
- **React Compiler:** Enabled (`reactCompiler: true` in next.config.ts)
- **Fonts:** Geist Sans + Geist Mono via `next/font`
- **Linting:** ESLint 9 with next/core-web-vitals and next/typescript configs

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint (eslint flat config)
```

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Architecture

- `src/app/` — Next.js App Router pages and layouts
- Uses CSS Modules for styling (`*.module.css`) alongside `globals.css`
- Environment variables in `.env` (gitignored)
