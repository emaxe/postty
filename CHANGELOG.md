# Changelog

All notable changes to the **Postty** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> [Версия на русском языке доступна здесь (Russian version)](./CHANGELOG.ru.md)

---

## [0.1.0] - 2026-09-05

### Added
- **Hybrid Monorepo Architecture**: Initialized pnpm workspaces, Turborepo pipeline, and Cargo workspace.
- **Shared Contracts (`@postty/contracts`)**:
  - Strict Zod schemas and TypeScript models for `RequestItem`, `Collection`, `Environment`, `Workspace`, `HttpResponse`, and `SyncMutation`.
- **Core Engine (`@postty/core`)**:
  - `VariableInterpolator`: Template substitution engine supporting `{{env}}`, nested vars, and dynamic generators (`{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`).
  - `RequestExecutor`: Pluggable request runner with automatic header injection and timing metrics.
  - `FetchTransport`: Web and Node.js fetch adapter.
  - 100% test coverage with Vitest suite.
- **Native Rust Engine (`crates/postty-core` & `crates/postty-sync`)**:
  - Asynchronous HTTP client based on `reqwest` and `rustls` for bypassing browser CORS limitations and supporting mTLS and custom certificates.
  - Embedded SQLite storage for local offline caching and synchronization mutations.
- **Terminal TUI & CLI (`apps/tui`)**:
  - Fullscreen Alternate Screen interface built on `ratatui` and `crossterm`.
  - Full mouse support (click collection items, tabs, send button, scroll response body).
  - Keyboard navigation with Vim bindings (`j`/`k`), tabs (`1`–`4`), and `Enter` to execute requests.
  - Headless CLI runner command (`postty run <collection>`).
  - Device Code Flow login command (`postty login`).
- **Web Client (`apps/web`)**:
  - Modern SPA interface built with React 18, Vite, and Tailwind CSS.
  - Interactive collection and request manager with HTTP method color badges.
  - Full Request Editor: Query params table, Headers table, Auth selector (Bearer, Basic, API Key), and Body modes (raw JSON, urlencoded).
  - Response Viewer: Status badges, response duration in ms, payload size in KB, and formatted JSON output with copy-to-clipboard button.
  - Environment modal with masked secret variable support.
  - Local persistence via `LocalStorage`.
- **Cloud Backend API (`apps/api`)**:
  - Fastify server with `@fastify/jwt` and `@fastify/cors`.
  - Authentication endpoints: register, login, and `/me` profile.
  - Complete OAuth 2.0 Device Authorization Grant (RFC 8628) flow for terminal CLI login.
  - Workspaces management (Personal and Team).
  - Delta synchronization API: full snapshot retrieval, mutation push, and versioned delta pull.
- **Desktop Application (`apps/desktop`)**:
  - Tauri v2 application wrapper with native Rust IPC command `execute_native_http`.
  - Zero-CORS network execution, mTLS support, and lightweight memory footprint.
- **Mobile Application (`apps/mobile`)**:
  - Touch-optimized client for iOS and Android built on React Native and Expo.
  - Swipeable collection requests, environment switcher, and scrollable response inspector.
- **Developer Experience**:
  - Interactive `run.sh` launcher script with formatted output using `printf`.
  - Comprehensive documentation in `docs/init/` and AI agent instructions in `AGENTS.md`.
