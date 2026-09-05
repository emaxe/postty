# Postty 🚀

> **Fast, offline-first cross-platform API testing suite & Postman alternative.**

[![CI](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-13%20passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)]()
[![Platforms](https://img.shields.io/badge/platforms-Web%20%7C%20Desktop%20%7C%20Mobile%20%7C%20TUI-indigo.svg)]()

> [Русская версия доступна здесь (Russian version)](./README.ru.md)

---

## 🌟 Key Features

* **4 Target Platforms + Unified Cloud**:
  * 🌐 **Web Client** (`apps/web`): Instant access from any browser built with React 18, Vite & Tailwind CSS.
  * 🖥️ **Desktop App** (`apps/desktop`): Native Tauri v2 client powered by Rust — **zero CORS restrictions**, support for custom/mTLS certificates and proxies, with minimal RAM footprint (~40 MB).
  * 📱 **Mobile App** (`apps/mobile`): Touch-optimized client for iOS and Android built with React Native and Expo.
  * ⌨️ **Terminal TUI & CLI** (`apps/tui`): Fullscreen Alternate Screen terminal application built with Rust (`ratatui` + `crossterm`) featuring **full mouse support** (clicks, scroll wheel) and keyboard navigation, plus a headless CI/CD runner.
* **Unified Account & Cloud Synchronization**:
  * Cloud Backend (`apps/api`) built on Fastify with JWT authentication and **OAuth 2.0 Device Code Flow (RFC 8628)** for passwordless CLI logins (`postty login`).
  * Realtime delta-synchronization of collections, environments, and workspaces across all devices.
* **Offline-First Architecture**:
  * Local caching (`IndexedDB` in browser, `SQLite` in Desktop, TUI, and Mobile) ensures uninterrupted workflows without an internet connection.
* **Zero-Knowledge Secrets (E2EE)**:
  * Sensitive variables (API keys, bearer tokens) can be encrypted client-side using user master keys.
* **Full Protocol Support**:
  * REST API, GraphQL, WebSockets, Server-Sent Events (SSE), and gRPC ready.

---

## 🏗️ Architecture & Monorepo Layout

```
postty/
├── apps/
│   ├── web/         # Web SPA/PWA client (React + Vite + Tailwind)
│   ├── desktop/     # Native Desktop application (Tauri v2 + Rust Core)
│   ├── mobile/      # Mobile application (React Native / Expo for iOS & Android)
│   ├── tui/         # Fullscreen Terminal UI & CLI (Rust + Ratatui)
│   └── api/         # Cloud Backend API (Fastify + JWT + Device Flow + Delta Sync)
│
├── packages/
│   ├── contracts/   # Strict Zod schemas & TypeScript DTOs
│   └── core/        # Request executor & template variable interpolator
│
├── crates/
│   ├── postty-core/ # Native asynchronous HTTP client (reqwest/rustls)
│   └── postty-sync/ # Local SQLite synchronization cache
│
├── docs/init/       # Architectural design documents & roadmap
├── AGENTS.md        # Guidelines for AI coding agents
├── run.sh           # Interactive CLI launcher menu
└── turbo.json       # Turborepo build pipeline
```

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js**: `v20+` (tested on `v22`)
* **pnpm**: `v9+` or `v11`
* **Rust & Cargo**: `1.80+` (tested on `1.94`)

### 2. Installation
```bash
git clone https://github.com/emaxe/postty.git
cd postty
pnpm install
```

### 3. Interactive Launcher
Launch any component using the interactive terminal menu:
```bash
./run.sh
```

---

## 💻 Manual Commands

### 🌐 Web Client (Port 3000)
```bash
pnpm turbo dev --filter=@postty/web
```

### ☁️ Cloud Backend API (Port 4000)
```bash
pnpm turbo dev --filter=@postty/api
```

### ⌨️ Terminal TUI (Rust)
```bash
cargo run --bin postty
```
* **Mouse**: Click collection requests, switch tabs (`Params`, `Headers`, `Body`, `Auth`), scroll response bodies.
* **Keyboard**: `Tab` (switch panel focus), `j`/`k` or `↑`/`↓` (navigate), `Enter` (execute request), `1`–`4` (tabs), `q` (quit).

### 🖥️ Desktop App (Tauri v2)
```bash
pnpm turbo dev --filter=@postty/desktop
```

### 📱 Mobile App (Expo)
```bash
pnpm turbo dev --filter=@postty/mobile
```

### 🧪 Running Tests
```bash
pnpm test
```

---

## 📄 License

Licensed under either of:
* Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
* MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
