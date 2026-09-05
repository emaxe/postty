# AGENTS.md — Instructions for AI Agents Working on Postty

This document provides architectural rules, guidelines, and commands for autonomous and pair-programming AI coding agents working within the **Postty** repository.

---

## 1. Project Overview & Architecture

**Postty** is an offline-first, cross-platform API testing suite and Postman alternative supporting REST, GraphQL, WebSocket, SSE, and gRPC. It is structured as a **hybrid monorepo** containing both TypeScript packages and Rust crates.

### Monorepo Layout
* `apps/`
  * `web/` — Web SPA/PWA client built with React 18, Vite, and Tailwind CSS.
  * `desktop/` — Desktop client built with Tauri v2 (macOS, Windows, Linux), utilizing the native Rust network engine to bypass browser CORS restrictions and support custom/mTLS certificates.
  * `mobile/` — Mobile client for iOS and Android built with React Native and Expo.
  * `tui/` — High-performance fullscreen Terminal User Interface built with Rust, Ratatui, and Crossterm (features mouse capture and keyboard shortcuts), plus headless CLI runner mode.
  * `api/` — Cloud backend built with Fastify, JWT auth, OAuth 2.0 Device Code Flow (RFC 8628), workspace management, and delta synchronization.
* `packages/`
  * `contracts/` — Shared Zod schemas and TypeScript data models (`HttpMethod`, `RequestItem`, `Collection`, `Environment`, `SyncMutation`).
  * `core/` — Platform-agnostic execution engine (`RequestExecutor`, `VariableInterpolator`, `FetchTransport`).
* `crates/`
  * `postty-core/` — Native Rust asynchronous HTTP client (`reqwest`, `rustls`), models mirroring TypeScript contracts, and template interpolator.
  * `postty-sync/` — Embedded SQLite sync cache for offline-first delta synchronization.
* `docs/init/` — Initial architectural specifications, roadmap, and design decisions.

---

## 2. Core Architectural Invariants & Rules

1. **Shared Contracts Single Source of Truth**:
   * Data models (`RequestItem`, `Collection`, `Environment`, etc.) are defined with strict Zod validation in `packages/contracts`.
   * When modifying data schemas, update `packages/contracts/src/` first, rebuild with `pnpm --filter @postty/contracts build`, and mirror changes in `crates/postty-core/src/models.rs`.
2. **Offline-First & Data Sync**:
   * Client applications must remain functional without an active internet connection. Data is stored locally (`IndexedDB` on Web, `SQLite` on Desktop/TUI/Mobile) and synchronized asynchronously via delta-mutations (`SyncMutation`).
3. **Network Transport Separation**:
   * **Web Client**: Uses browser `fetch` (with CORS limitations).
   * **Desktop & TUI**: Uses native Rust `reqwest` sockets (bypasses browser CORS, supports system proxies, custom CAs, self-signed certificates, and cookies).
4. **Shell Scripting Convention**:
   * All user-facing text output in shell scripts (such as `run.sh`) **MUST** strictly use `printf` rather than `echo`.
5. **Secrets & Security**:
   * Variables flagged with `isSecret: true` must never be stored in plain text or logged to stdout. In cloud sync, they are encrypted client-side using user master keys.

---

## 3. Essential Commands

### Quick Launcher
```bash
./run.sh                     # Interactive CLI launcher menu (uses printf)
```

### TypeScript / Monorepo (pnpm + Turborepo)
```bash
pnpm install                 # Install all JS/TS dependencies
pnpm test                    # Run all unit and integration tests (Vitest)
pnpm build                   # Build all packages and web/desktop assets
pnpm turbo dev --filter=@postty/web      # Run Web app on http://localhost:3000
pnpm turbo dev --filter=@postty/api      # Run Cloud API on http://localhost:4000
pnpm turbo dev --filter=@postty/desktop  # Run Desktop app (Tauri v2)
pnpm turbo dev --filter=@postty/mobile   # Run Mobile app (Expo)
```

### Rust Workspace (Cargo)
```bash
cargo check --workspace      # Typecheck all Rust crates (tui, desktop, core, sync)
cargo run --bin postty       # Launch interactive fullscreen TUI
cargo run --bin postty -- --help         # Inspect CLI commands
cargo test --workspace       # Run Rust crate tests
```

---

## 4. Git & Commit Guidelines

* Use **Conventional Commits**:
  * `feat(component): description` (e.g., `feat(web): add response filtering`)
  * `fix(component): description` (e.g., `fix(core): handle URL encoding edge case`)
  * `refactor(component): description`
  * `docs: description`
  * `test: description`
* Always ensure `pnpm test` and `cargo check --workspace` pass with zero errors before committing.
