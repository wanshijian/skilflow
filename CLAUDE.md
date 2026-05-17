# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillFlow is a cross-platform AI skill hub built with Taro 3 (React) for both H5 Web and WeChat Mini Program. Backend uses Supabase (PostgreSQL + Auth + Edge Functions). Gemini 1.5 Flash API powers AI-based README parsing, auto-tagging, and content summarization. v2.0 adds App Factory (natural language → AI code gen → Docker sandbox → download), quota/payment system, and enhanced GEO. GitHub Actions runs daily scraping pipelines.

## Commands

```bash
npm run dev:h5          # Start H5 dev server (Web)
npm run dev:weapp       # Build + watch for WeChat Mini Program
npm run build:h5        # Production build H5
npm run build:weapp     # Production build Mini Program
npm run scrape          # Run GitHub Trending scraper locally
npm run generate-llms   # Generate llms.txt for AI crawlers
```

## Architecture

```
src/
  pages/        # 11 pages: index, skill (list/detail), app-factory (index/result), news (list/detail), labs, feedback, showcase, admin, user
  components/   # Reusable: SkillCard, TagCloud, TagBar, FilterPanel, SearchBox, NewsCard, AppCard, QuotaBar, Layout
  stores/       # zustand state: authStore, skillStore, filterStore, appStore
  hooks/        # useAuth, useSkills, useSupabase, useAppFactory
  utils/        # supabase client, api layer, constants (tag library)
supabase/
  migrations/   # PostgreSQL schema v1 + v2（app factory/quota/payment/config tables）
  edge-functions/  # Deno: gemini-proxy, ai-parse, content-check, rss-fetch, code-gen, sandbox, wechat-pay
scripts/         # Node scripts: scraper.ts, generate-llms-txt.ts
docker/          # Docker sandbox for code execution
.github/workflows/  # daily-scrape.yml, deploy.yml
```

## Key Design Decisions

- **API Security**: Sensitive keys (Gemini, WeChat) are never exposed to frontend. All external API calls go through Supabase Edge Functions (`supabase/edge-functions/`).
- **Cross-platform**: Use Taro conditional compilation `// #ifdef WEAPP` / `// #ifdef H5` for platform-specific code. Styling uses px units; Taro auto-converts to rpx for mini program.
- **Multi-dimensional tags**: Defined in `src/utils/constants.ts` — four tag dimensions (industry, capability, platform, pricing). AI auto-tags skills during README parsing via `ai-parse` Edge Function.
- **Auth**: Supabase Auth with GitHub OAuth (Web) + WeChat login (Mini Program). Profile table extends `auth.users`. Admin role checked in `profiles.role`.
- **Search**: PostgreSQL tsvector full-text search on skills, auto-updated via trigger. Frontend semantic search maps keywords to tags via `SEMANTIC_MAP` in constants.
- **Content safety**: WeChat `msgSecCheck` integration via `content-check` Edge Function. All AI-generated text should pass review before display.
- **GEO**: `llms.txt` generated daily for AI crawler discoverability. JSON-LD structured data (`SoftwareApplication`) injected on skill detail pages with featureList.
- **App Factory (v2.0)**: Users describe apps in natural language → Gemini 1.5 Pro generates code → Docker sandbox tests safely → 48hr download. Quota system: 1 free/day + share bonus + single/Pro purchase via WeChat Pay.
- **Dual Gemini model**: Flash for low-cost parsing/summarization/tagging; Pro for high-precision code generation. Both proxied through separate Edge Functions.
- **Quota security**: All quota checks and deductions happen server-side via PostgreSQL RPC with row-level locking. Frontend never owns the count.

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `WECHAT_APPID`, `WECHAT_SECRET` (for mini program features)

## Database

Schema is in `supabase/migrations/00001_schema.sql`. Key tables: `skills`, `news`, `profiles`, `feedback`, `comments`. Run migrations via Supabase CLI or Dashboard SQL editor. Seed data in `supabase/seed.sql`.

## Automation Pipeline

1. GitHub Actions `daily-scrape.yml` runs daily at UTC 2:00
2. `scripts/scraper.ts` fetches GitHub trending + calls `ai-parse` Edge Function
3. `ai-parse` calls Gemini to extract structured skill data → inserts as `draft`
4. Admin reviews drafts in `/pages/admin/index` → publishes
5. `generate-llms-txt.ts` regenerates the AI-readable site map
