# Postty 🚀

> **Быстрый, приватный кроссплатформенный инструмент тестирования API и альтернатива Postman с концепцией Offline-First.**

[![CI](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-13%20passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)]()
[![Platforms](https://img.shields.io/badge/platforms-Web%20%7C%20Desktop%20%7C%20Mobile%20%7C%20TUI-indigo.svg)]()

> [English version is available here](./README.md)

---

## 🌟 Ключевые возможности

* **4 клиентские платформы + единое облако**:
  * 🌐 **Web-клиент** (`apps/web`): Моментальный доступ из браузера на React 18, Vite и Tailwind CSS.
  * 🖥️ **Desktop-приложение** (`apps/desktop`): Нативное приложение на базе Tauri v2 и Rust — **полный обход ограничений CORS**, поддержка системных прокси, mTLS и самоподписанных сертификатов при минимальном потреблении RAM (~40 МБ).
  * 📱 **Мобильное приложение** (`apps/mobile`): Тач-клиент для iOS и Android на React Native и Expo.
  * ⌨️ **Терминальный TUI и CLI** (`apps/tui`): Полноэкранный терминальный интерфейс на Rust (`ratatui` + `crossterm`) с **полной поддержкой мыши** (клики по запросам и табам, скролл ответов колесиком) и хоткеев, плюс консольный раннер коллекций для CI/CD.
* **Единая учетная запись и облачная синхронизация**:
  * Облачный бэкенд (`apps/api`) на Fastify с JWT-авторизацией и **OAuth 2.0 Device Code Flow (RFC 8628)** для входа из терминала без пароля (`postty login`).
  * Двусторонняя дельта-синхронизация коллекций, сред и воркспейсов между всеми устройствами.
* **Архитектура Offline-First**:
  * Локальное хранение (`IndexedDB` в вебе, `SQLite` на Desktop, TUI и Mobile) гарантирует непрерывную работу без интернета.
* **Безопасность Zero-Knowledge (E2EE)**:
  * Чувствительные переменные (токены, пароли) шифруются на стороне клиента мастер-ключом пользователя.

---

## 🏗️ Структура монорепозитория

```
postty/
├── apps/
│   ├── web/         # Веб-клиент (React + Vite + Tailwind)
│   ├── desktop/     # Нативное десктопное приложение (Tauri v2 + Rust Core)
│   ├── mobile/      # Мобильное приложение (React Native / Expo для iOS и Android)
│   ├── tui/         # Полноэкранный терминальный TUI & CLI (Rust + Ratatui)
│   └── api/         # Облачный бэкенд API (Fastify + JWT + Device Flow + Sync)
│
├── packages/
│   ├── contracts/   # Строгие схемы Zod и TypeScript DTO
│   └── core/        # Исполнитель запросов и интерполятор переменных
│
├── crates/
│   ├── postty-core/ # Нативный асинхронный HTTP-клиент (reqwest/rustls)
│   └── postty-sync/ # Локальный SQLite кэш для дельта-синхронизации
│
├── docs/init/       # Архитектурная документация и Roadmap
├── AGENTS.md        # Руководство для ИИ-агентов разработчиков
├── run.sh           # Интерактивное меню запуска (на базе printf)
└── turbo.json       # Конфигурация пайплайнов Turborepo
```

---

## 🚀 Быстрый запуск

### 1. Требования
* **Node.js**: `v20+` (проверено на `v22`)
* **pnpm**: `v9+` или `v11`
* **Rust и Cargo**: `1.80+` (проверено на `1.94`)

### 2. Клонирование и установка зависимостей
```bash
git clone https://github.com/emaxe/postty.git
cd postty
pnpm install
```

### 3. Интерактивное меню запуска
Запустите любой компонент через удобный скрипт:
```bash
./run.sh
```

---

## 💻 Ручные команды запуска

### 🌐 Web-клиент (Порт 3000)
```bash
pnpm turbo dev --filter=@postty/web
```

### ☁️ Облачный бэкенд API (Порт 4000)
```bash
pnpm turbo dev --filter=@postty/api
```

### ⌨️ Терминальный TUI (Rust)
```bash
cargo run --bin postty
```
* **Мышь**: Клики по запросам дерева, переключение вкладок (`Params`, `Headers`, `Body`, `Auth`), скролл длинных JSON/XML ответов колесиком.
* **Клавиатура**: `Tab` (переключение панелей), `j`/`k` или `↑`/`↓` (навигация), `Enter` (отправка запроса), `1`–`4` (вкладки), `q` (выход).

### 🖥️ Desktop-приложение (Tauri v2)
```bash
pnpm turbo dev --filter=@postty/desktop
```

### 📱 Мобильное приложение (Expo)
```bash
pnpm turbo dev --filter=@postty/mobile
```

### 🧪 Запуск всех тестов
```bash
pnpm test
```

---

## 📄 Лицензия

Проект распространяется под двойной лицензией:
* Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) или http://www.apache.org/licenses/LICENSE-2.0)
* MIT license ([LICENSE-MIT](LICENSE-MIT) или http://opensource.org/licenses/MIT)
по вашему выбору.
