# Структура монорепозитория и стек Postty

## 1. Дерево файлов монорепозитория

```
postty/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, TypeCheck, Rust test, Unit-тесты
│       ├── release-desktop.yml    # Сборка DMG, MSI, AppImage
│       ├── release-tui.yml        # Кросс-компиляция бинарников postty CLI/TUI
│       └── deploy-web-api.yml     # Деплой Web и Backend
│
├── apps/
│   ├── api/                       # Cloud Backend API (Fastify + Drizzle ORM)
│   │   ├── src/
│   │   │   ├── modules/auth/      # Авторизация, сессии, OAuth2, Device Flow (RFC 8628)
│   │   │   ├── modules/workspace/ # Воркспейсы, права доступа
│   │   │   ├── modules/sync/      # WebSocket шлюз и delta-синхронизация
│   │   │   └── db/                # Схемы PostgreSQL и миграции
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── desktop/                   # Нативное десктопное приложение
│   │   ├── src-tauri/             # Rust код (Tauri v2)
│   │   │   ├── src/main.rs        # Нативный сетевой движок (reqwest/hyper)
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── src/                   # UI оболочка десктопа (React/Vite)
│   │   └── package.json
│   │
│   ├── web/                       # Веб-интерфейс (SPA/PWA)
│   │   ├── src/
│   │   │   ├── app/               # Роутинг и экраны (Dashboard, Request Editor)
│   │   │   └── main.tsx
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── mobile/                    # Мобильное приложение (iOS / Android)
│   │   ├── app/                   # Expo Router экраны
│   │   ├── components/            # Нативные мобильные компоненты
│   │   ├── app.json               # Конфиг Expo
│   │   └── package.json
│   │
│   └── tui/                       # Полноэкранный Terminal TUI & CLI (Rust)
│       ├── src/
│       │   ├── ui/                # Ratatui виджеты: layout, tree, editor, response, tabs
│       │   ├── events/            # Crossterm обработчик клавиатуры и мыши
│       │   ├── cli/               # Подкоманды (login, run, sync, import/export)
│       │   ├── app.rs             # Главный жизненный цикл приложения и состояние
│       │   └── main.rs
│       └── Cargo.toml
│
├── crates/                        # Общие Rust-крейты для Desktop и TUI
│   ├── postty-core/               # Сетевой стек (reqwest), SSL, прокси, SQLite
│   │   ├── src/
│   │   │   ├── client.rs
│   │   │   ├── storage.rs
│   │   │   └── env.rs
│   │   └── Cargo.toml
│   │
│   └── postty-sync/               # WebSocket клиент синхронизации и CRDT на Rust
│       ├── src/
│       │   ├── client.rs
│       │   └── crdt.rs
│       └── Cargo.toml
│
├── packages/
│   ├── core/                      # TypeScript бизнес-логика (Web, Mobile, Node.js)
│   │   ├── src/
│   │   │   ├── http/              # Модели HTTP запросов/ответов, заголовки, auth
│   │   │   ├── interpolation/     # Парсер шаблонов {{env_var}}
│   │   │   ├── sandbox/           # Выполнение Pre-request & Post-response тестов
│   │   │   └── importers/         # Парсеры Postman v2.1, OpenAPI/Swagger, cURL
│   │   └── package.json
│   │
│   ├── contracts/                 # Zod-схемы, DTO и интерфейсы синхронизации
│   │   ├── src/
│   │   │   ├── request.ts
│   │   │   ├── collection.ts
│   │   │   ├── environment.ts
│   │   │   └── sync.ts
│   │   └── package.json
│   │
│   ├── ui/                        # Общая дизайн-система (Tailwind + Radix)
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── code-viewer.tsx
│   │   └── package.json
│   │
│   ├── sync/                      # Клиентский движок синхронизации для Web/Mobile
│   │   ├── src/
│   │   │   ├── db.ts              # Локальная база (IndexedDB/SQLite обертка)
│   │   │   ├── crdt.ts            # Слияние правок и разрешение коллизий
│   │   │   └── client.ts          # WebSocket клиент для связи с бэкендом
│   │   └── package.json
│   │
│   └── crypto/                    # E2EE клиентское шифрование
│       ├── src/
│       │   ├── key-derivation.ts  # PBKDF2 / Argon2id
│       │   └── aes-gcm.ts         # Шифрование секретных переменных
│       └── package.json
│
├── docs/
│   └── init/
│       ├── PLAN.md                # Главный дорожный план реализации
│       ├── ARCHITECTURE.md        # Системная архитектура и протоколы
│       └── MONOREPO_STRUCTURE.md  # Данный документ
│
├── Cargo.toml                     # Cargo workspace для Rust крейтов (tui, crates/*, desktop)
├── package.json                   # Корневой package.json монорепозитория
├── pnpm-workspace.yaml            # Рабочие пространства pnpm
├── turbo.json                     # Конфигурация Turborepo пайплайнов
└── tsconfig.base.json             # Базовая конфигурация TypeScript
```

---

## 2. Команды для быстрого запуска разработки

```bash
# 1. Установка JS/TS зависимостей монорепозитория
pnpm install

# 2. Запуск локальной инфраструктуры (PostgreSQL, Redis)
docker compose up -d

# 3. Запуск Web + API в режиме разработки
pnpm turbo dev --filter=@postty/web --filter=@postty/api

# 4. Запуск Desktop приложения (Tauri v2)
pnpm turbo dev --filter=@postty/desktop

# 5. Запуск полноэкранного TUI приложения (с поддержкой мыши и хоткеев)
cargo run --bin postty-tui

# 6. Запуск TUI в headless CLI режиме для прогона коллекции
cargo run --bin postty -- run ./examples/billing-api.json -e ./examples/dev.env.json

# 7. Запуск Mobile приложения (Expo dev client)
pnpm turbo dev --filter=@postty/mobile
```
